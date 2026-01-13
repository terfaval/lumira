import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { NapszakInitializer } from "@/components/NapszakInitializer";
import CosmicLayerGate from "@/components/CosmicLayerGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lumira",
  description: "Lumira visual system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}>
        <NapszakInitializer />
        <div
  aria-hidden="true"
  style={{
    position: "fixed",
    inset: 0,
    background: "hotpink",
    zIndex: 0,
    pointerEvents: "none",
  }}
/>

<main style={{ position: "relative", zIndex: 1 }}>{children}</main>

      </body>
    </html>
  );
}

