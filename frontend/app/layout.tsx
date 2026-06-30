import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Moodit – Mood of Reddit",
  description:
    "Analyse the sentiment of any Reddit keyword in real-time using VADER, TextBlob, DistilBERT, and Gemini AI explanations.",
  keywords: ["Reddit", "sentiment analysis", "NLP", "AI", "BERT", "Gemini"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
