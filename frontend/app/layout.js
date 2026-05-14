import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from '../lib/theme';

export const metadata = {
  title: 'FinBot — Personal Finance for Students',
  description: 'AI-powered finance assistant for students',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}