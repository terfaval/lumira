"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { requireUserId } from "@/src/lib/db";
type SessionListItem = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  raw_entry?: string | null;
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
          .select("id, status, created_at, updated_at, archived_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        const sessions = (data ?? []) as Array<{
          id: string;
          status: string;
          created_at: string;
          updated_at: string;
          archived_at?: string | null;
        }>;

        const sessionIds = sessions.map((s) => s.id);
        const rawBySession = new Map<string, string>();
        if (sessionIds.length > 0) {
          const { data: entries } = await supabase
            .from("dream_entries")
            .select("session_id,content,created_at")
            .eq("user_id", userId)
            .eq("kind", "raw")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: false });

          (entries ?? []).forEach((row: any) => {
            if (rawBySession.has(row.session_id)) return;
            if (typeof row.content === "string") rawBySession.set(row.session_id, row.content);
          });
        }

        const rows: SessionListItem[] = sessions.map((s) => ({
          ...s,
          raw_entry: rawBySession.get(s.id) ?? null,
        }));

        setSessions(rows);
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
                    {(s.raw_entry ?? "").slice(0, 160)}
                    {(s.raw_entry ?? "").length > 160 ? "…" : ""}
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
