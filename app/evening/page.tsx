"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function EveningLanding() {
  const { loading } = useRequireAuth();

  return (
    <Shell title="Esti tér" space="evening">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div className="stack">
          <p style={{ color: "var(--text-muted)" }}>
            Ez a tér este nyílik: kártyák, rövid levezető blokkok, visszakapcsolás az álomtérhez.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/evening/cards" className="btn btn-primary">
              Esti kártyák
            </Link>
            <Link href="/new" className="btn btn-secondary">
              Vissza az álomtérhez
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}