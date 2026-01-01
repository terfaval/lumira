"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
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
    <Shell title="Álom összkép" space="dream">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : !session ? (
        <p>Betöltés…</p>
      ) : (
        <div className="stack">
          <div className="meta-block">
            <span className="badge-muted">Státusz: {session.status}</span>
            {session.archived_at && <span className="badge-muted">Archiválva: {new Date(session.archived_at).toLocaleString("hu-HU")}</span>}
          </div>

          <Card>
            <div className="stack-tight">
              <div className="section-title">Rögzített álom</div>
              <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{session.raw_dream_text}</div>
            </div>
          </Card>

          <Card>
            <div className="stack-tight">
              <div className="section-title">Keretezés</div>
              <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
                {session.ai_framing_text ?? "Még nincs keretezés."}
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack-tight">
              <div className="section-title">Kártyás feldolgozás</div>
              {workBlocks.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>Még nincsenek blokkok.</p>
              ) : (
                <ul style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
                  {workBlocks.map((b) => (
                    <li key={b.id} style={{ opacity: 0.85 }}>
                      #{b.sequence}: {b.ai_question} ({b.block_state})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/session/${id}/frame`} className="btn btn-primary">
              Keretezés
            </Link>
            <Link href={`/session/${id}/direction`} className="btn btn-primary">
              Irányválasztás
            </Link>
            <Link href={`/session/${id}/work`} className="btn btn-primary">
              Feldolgozás
            </Link>
            <Link href="/sessions" className="btn btn-secondary">
              Vissza a listához
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}