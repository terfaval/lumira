import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NapszakInitializer } from "@/components/NapszakInitializer";
import FractalLayerGate from "@/components/FractalLayerGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumira",
  description: "Lumira visual system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NapszakInitializer />

        {/* ✅ háttér – csak bizonyos space-ekben */}
        <FractalLayerGate />

        {/* ✅ a teljes UI mindig a fraktál fölött */}
        <main style={{ position: "relative", zIndex: 1 }}>{children}</main>
      </body>
    </html>
  );
}
