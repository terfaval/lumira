import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { NapszakInitializer } from "@/components/NapszakInitializer";
// import FractalLayerGate from "@/components/FractalLayerGate";
import BackgroundLayerGate from "@/components/BackgroundLayerGate";
import CosmicNeonLayerGate from "@/components/CosmicNeonLayerGate";

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
        <CosmicNeonLayerGate 
          imageUrl="/public/background/background2.png"
          intensity={0.9}/>
        <main style={{ position: "relative", zIndex: 1 }}>{children}</main>

      </body>
    </html>
  );
}

