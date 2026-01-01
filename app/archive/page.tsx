
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { requireUserId } from "@/src/lib/db";
import type { DreamSession } from "@/src/lib/types";

type ArchiveSession = DreamSession & {
  archived_at?: string | null;
};

export default function ArchivePage() {
  const { loading } = useRequireAuth();
  const [sessions, setSessions] = useState<ArchiveSession[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from("dream_sessions")
          .select("id, raw_dream_text, status, archived_at, updated_at")
          .eq("user_id", userId)
          .order("archived_at", { ascending: false })
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setSessions((data ?? []) as ArchiveSession[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Nem sikerült betölteni az archívumot.";
        setErr(message);
      }
    })();
  }, []);

  const archived = sessions.filter((s) => s.archived_at || s.status === "archived");

  return (
    <Shell title="Archívum">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ opacity: 0.8 }}>Itt az archivált vagy lezárt álomsessziók listája.</p>
          <Link href="/sessions" style={{ textDecoration: "underline", width: "fit-content" }}>
            Vissza a folyamatban lévőkhöz
          </Link>

          {err && <p style={{ color: "crimson" }}>{err}</p>}

          {archived.length === 0 ? (
            <p>Még nincs archivált session.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {archived.map((s) => (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, display: "grid", gap: 6 }}
                >
                  <div style={{ fontWeight: 700 }}>Session #{s.id.slice(0, 8)}</div>
                  <div style={{ opacity: 0.7 }}>Státusz: {s.status}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    Archiválva: {s.archived_at ? new Date(s.archived_at).toLocaleString("hu-HU") : "nincs dátum"}
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