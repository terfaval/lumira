"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function EveningLanding() {
  const { loading } = useRequireAuth();

  return (
    <Shell title="Esti tér">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p>Üdvözöljük az esti kártyák terén.</p>
          <Link
            href="/evening/cards"
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "10px 16px",
              borderRadius: 10,
              background: "#111827",
              color: "white",
            }}
          >
            Esti kártyák
          </Link>
          <Link href="/new" style={{ textDecoration: "underline", width: "fit-content" }}>
            Vissza az álomtérhez
          </Link>
        </div>
      )}
    </Shell>
  );
}