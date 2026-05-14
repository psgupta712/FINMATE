const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

// POST /api/receipt/scan
// Body: { imageBase64: "data:image/jpeg;base64,..." }
router.post("/scan", protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    // Extract the pure base64 data and media type
    const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, message: "Invalid image format. Expected data URI." });
    }
    const mediaType = matches[1]; // e.g. "image/jpeg"
    const base64Data = matches[2]; // pure base64, no prefix

    const prompt = `You are a receipt/bill parser for a student finance app. Analyze this receipt or bill image and extract the key details.

Respond ONLY with a valid JSON object. No explanation, no markdown, no extra text. Just the JSON.

JSON format:
{
  "amount": <total amount as number, e.g. 245.50>,
  "date": "<date in YYYY-MM-DD format, use today if not visible>",
  "description": "<short merchant name or bill description, max 40 chars>",
  "category": "<one of: Food & Dining, Transport, Education, Entertainment, Shopping, Health, Utilities, Rent, Subscription, Other>",
  "paymentMethod": "<one of: cash, upi, card, wallet, netbanking, other>",
  "confidence": "<high, medium, or low>"
}

Rules:
- amount must be a number (the final total/grand total, not subtotals)
- If you cannot read the amount clearly, set confidence to "low"
- Pick the most appropriate category from the list
- For payment method, look for UPI/Paytm/PhonePe = upi, Visa/Mastercard = card, Cash = cash, otherwise = other
- Keep description short and human-readable (e.g. "Zomato order", "DMart grocery", "Auto rickshaw")`;

    // ✅ Correct Groq vision API format: base64 source, not URL
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  // Groq vision expects the full data URI (data:image/...;base64,...)
                  url: `data:${mediaType};base64,${base64Data}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || `Groq API error (${response.status})`;
      console.error("Groq API error:", errMsg);
      return res.status(502).json({ success: false, message: "Receipt scan service unavailable. Please enter details manually." });
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    if (!rawText) {
      return res.status(422).json({ success: false, message: "No response from AI. Please try again." });
    }

    // Parse the JSON response — strip markdown fences if present
    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return res.status(422).json({ success: false, message: "Could not read receipt. Please enter details manually." });
        }
      } else {
        return res.status(422).json({ success: false, message: "Could not read receipt. Please enter details manually." });
      }
    }

    // Validate and sanitize
    const VALID_CATEGORIES = [
      "Food & Dining", "Transport", "Education", "Entertainment",
      "Shopping", "Health", "Utilities", "Rent", "Subscription", "Other",
    ];
    const VALID_METHODS = ["cash", "upi", "card", "wallet", "netbanking", "other"];
    const today = new Date().toISOString().split("T")[0];

    const result = {
      amount: Math.abs(Number(parsed.amount)) || 0,
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today,
      description: String(parsed.description || "").slice(0, 80),
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      paymentMethod: VALID_METHODS.includes(parsed.paymentMethod) ? parsed.paymentMethod : "other",
      confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium",
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Receipt scan error:", err);
    res.status(500).json({ success: false, message: err.message || "Receipt scan failed" });
  }
});

module.exports = router;