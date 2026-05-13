const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

// POST /api/receipt/scan
// Body: { imageBase64: "data:image/jpeg;base64,..." }
router.post("/scan", protect, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res
        .status(400)
        .json({ success: false, message: "No image provided" });
    }

    // Strip the data URL prefix to get pure base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mediaType =
      imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

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

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
                  image_url: { url: imageBase64 }, // your existing base64 variable
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
    );

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    if (!rawText) {
      return res
        .status(422)
        .json({
          success: false,
          message: "No response from AI. Please try again.",
        });
    }

    // Parse the JSON response
    let parsed;
    try {
      // Clean up response — Gemini sometimes wraps in ```json ... ```
      const cleaned = rawText.replace(/```json|```/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON object from anywhere in the text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return res
            .status(422)
            .json({
              success: false,
              message: "Could not read receipt. Please enter details manually.",
            });
        }
      } else {
        return res
          .status(422)
          .json({
            success: false,
            message: "Could not read receipt. Please enter details manually.",
          });
      }
    }

    // Validate and sanitize
    const VALID_CATEGORIES = [
      "Food & Dining",
      "Transport",
      "Education",
      "Entertainment",
      "Shopping",
      "Health",
      "Utilities",
      "Rent",
      "Subscription",
      "Other",
    ];
    const VALID_METHODS = [
      "cash",
      "upi",
      "card",
      "wallet",
      "netbanking",
      "other",
    ];

    const today = new Date().toISOString().split("T")[0];

    const result = {
      amount: Math.abs(Number(parsed.amount)) || 0,
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today,
      description: String(parsed.description || "").slice(0, 80),
      category: VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "Other",
      paymentMethod: VALID_METHODS.includes(parsed.paymentMethod)
        ? parsed.paymentMethod
        : "other",
      confidence: ["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : "medium",
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Receipt scan error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Receipt scan failed" });
  }
});

module.exports = router;
