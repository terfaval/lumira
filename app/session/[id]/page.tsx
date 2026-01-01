"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import type { DreamSession, WorkBlock } from "@/src/lib/types";

type SessionDetail = DreamSession & {
  archived_at?: string | null;
};

export default function SessionOverview() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [workBlocks, setWorkBlocks] = useState<WorkBlock[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const { data, error } = await supabase
          .from("dream_sessions")
          .select("id, raw_dream_text, ai_framing_text, status, created_at, updated_at, archived_at")
          .eq("id", id)
          .single();
        if (error) throw error;
        setSession((data ?? null) as SessionDetail | null);

        const { data: blocks, error: wbErr } = await supabase
          .from("work_blocks")
          .select("id, session_id, direction_slug, sequence, ai_context, ai_question, user_answer, block_state")
          .eq("session_id", id)
          .order("sequence", { ascending: true });

        if (wbErr) throw wbErr;
        setWorkBlocks((blocks ?? []) as WorkBlock[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Nem sikerült betölteni az összképet.";
        setErr(message);
      }
    })();
  }, [id]);

  return (
    <Shell title="Álom összkép">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : !session ? (
        <p>Betöltés…</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ opacity: 0.7 }}>Státusz: {session.status}</div>
          {session.archived_at && <div style={{ color: "#9b1c1c" }}>Archiválva: {new Date(session.archived_at).toLocaleString("hu-HU")}</div>}

          <section style={{ display: "grid", gap: 8 }}>
            <h3>Rögzített álom</h3>
            <div style={{ whiteSpace: "pre-wrap", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
              {session.raw_dream_text}
            </div>
          </section>

          <section style={{ display: "grid", gap: 8 }}>
            <h3>Keretezés</h3>
            <div style={{ whiteSpace: "pre-wrap", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
              {session.ai_framing_text ?? "Még nincs keretezés."}
            </div>
          </section>

          <section style={{ display: "grid", gap: 8 }}>
            <h3>Kártyás feldolgozás</h3>
            {workBlocks.length === 0 ? (
              <p>Még nincsenek blokkok.</p>
            ) : (
              <ul style={{ paddingLeft: 16, display: "grid", gap: 6 }}>
                {workBlocks.map((b) => (
                  <li key={b.id} style={{ opacity: 0.85 }}>
                    #{b.sequence}: {b.ai_question} ({b.block_state})
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/session/${id}/frame`}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", color: "white", background: "#111827" }}
            >
              Keretezés
            </Link>
            <Link
              href={`/session/${id}/direction`}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", color: "white", background: "#111827" }}
            >
              Irányválasztás
            </Link>
            <Link
              href={`/session/${id}/work`}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111827", color: "white", background: "#111827" }}
            >
              Feldolgozás
            </Link>
            <Link href="/sessions" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db" }}>
              Vissza a listához
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}