"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { requireUserId } from "@/src/lib/db";
import type { DreamSession } from "@/src/lib/types";

type SessionListItem = DreamSession & {
  archived_at?: string | null;
};

export default function SessionListPage() {
  const { loading } = useRequireAuth();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from("dream_sessions")
          .select("id, raw_dream_text, status, created_at, updated_at, archived_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setSessions((data ?? []) as SessionListItem[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Nem sikerült betölteni a sessionöket.";
        setErr(message);
      }
    })();
  }, []);

  const activeSessions = sessions.filter((s) => !s.archived_at && s.status !== "archived");

  return (
    <Shell title="Folyamatban">
      {loading ? (
        <FullScreenLoadingOverlay open />
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <p style={{ opacity: 0.8 }}>
            Itt folytathatod a megkezdett álmaidat — bármikor megállhatsz, és később visszatérhetsz.
          </p>

          <Link
            href="/new"
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: 10,
              background: "#111827",
              color: "white",
            }}
          >
            Új álom
          </Link>

          {err && <p style={{ color: "crimson" }}>{err}</p>}

          {activeSessions.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Nincs folyamatban lévő álmod.</p>
          ) : (
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              {activeSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: "var(--space-3)",
                    display: "grid",
                    gap: "var(--space-1)",
                  }}
                >
                  <div style={{ fontWeight: 700, display: "flex", gap: "var(--space-2)", alignItems: "baseline", flexWrap: "wrap" }}>
                    <span>Álom</span>
                    <span style={{ opacity: 0.6, fontWeight: 600 }}>#{s.id.slice(0, 8)}</span>
                    <span style={{ opacity: 0.7, fontSize: 12 }}>{s.status}</span>
                  </div>

                  <div style={{ opacity: 0.7, whiteSpace: "pre-wrap" }}>
                    {(s.raw_dream_text ?? "").slice(0, 160)}
                    {(s.raw_dream_text ?? "").length > 160 ? "…" : ""}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {new Date(s.updated_at).toLocaleString("hu-HU")}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
