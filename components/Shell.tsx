"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/">Home</Link>
          <Link href="/archive">Archívum</Link>
          <Link href="/evening">Esti tér</Link>
        </div>
        <button
          onClick={logout}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc", background: "white" }}
        >
          Kijelentkezés
        </button>
      </div>
      <h1 style={{ margin: "12px 0 16px" }}>{title}</h1>
      {children}
    </div>
  );
}