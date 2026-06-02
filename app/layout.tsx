import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-reflective-serif",
});

const text = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-reflective-sans",
});

export const metadata: Metadata = {
  title: "Lumira Reflective Space",
  description: "Clean-room reflective substrate skeleton",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${text.variable}`}>{children}</body>
    </html>
  );
}
