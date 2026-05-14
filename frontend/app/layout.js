import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '../lib/auth';

// Inter was imported but overridden by DM Sans in globals.css — removed.
// Syne + DM Sans are loaded via Google Fonts in globals.css directly.

export const metadata = {
  title: 'FinBot — Personal Finance for Students',
  description: 'AI-powered finance assistant for students',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/*
          Razorpay checkout must be loaded with next/script, NOT a bare <script> tag.
          strategy="lazyOnload" loads it after the page is interactive, which is fine
          since it's only needed when the user clicks "Pay". If you need it available
          immediately on page load, use strategy="beforeInteractive" instead.
        */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}