"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <Link href="/">Home</Link>
        <Link href="/archive">Archívum</Link>
        <Link href="/evening">Esti tér</Link>
      </div>
      <h1 style={{ margin: "12px 0 16px" }}>{title}</h1>
      {children}
    </div>
  );
}
