import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'FinBot — Personal Finance for Students',
  description: 'AI-powered finance assistant for students',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
