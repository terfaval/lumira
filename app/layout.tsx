import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Work_Sans } from "next/font/google";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-reflective-serif",
});

const sans = Work_Sans({
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
      <body className={`${serif.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
