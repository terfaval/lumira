"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Home() {
  return (
    <Shell title="Mira">
      <p>Mit szeretnél most?</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/new"><PrimaryButton>Új álom rögzítése</PrimaryButton></Link>
        <Link href="/archive"><PrimaryButton>Archívum</PrimaryButton></Link>
        <Link href="/evening"><PrimaryButton>Esti tér</PrimaryButton></Link>
      </div>
    </Shell>
  );
}
