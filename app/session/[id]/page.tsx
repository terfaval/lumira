"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { isDirectionCardContent, type DreamSession, type WorkBlock } from "@/src/lib/types";

type SessionDetail = DreamSession & {
  archived_at?: string | null;
};

function renderBlockSummary(block: WorkBlock) {
  if (!isDirectionCardContent(block.content)) return "Ismeretlen kártya";
  const question = block.content.ai?.question ?? "";
  const isAnswered = (block.content.state ?? "open") === "answered";
  return question ? `${question}${isAnswered ? " · rögzítve" : ""}` : isAnswered ? "Rögzítve" : "Kártya";
}

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
          .select("id, session_id, user_id, block_type, content, created_at, updated_at")
          .eq("session_id", id)
          .eq("block_type", "dream_analysis")
          .order("created_at", { ascending: true });

        if (wbErr) throw wbErr;
        setWorkBlocks((blocks ?? []) as WorkBlock[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Nem sikerült betölteni az összképet.";
        setErr(message);
      }
    })();
  }, [id]);

  const Spinner = (
    <>
      <div
        aria-label="Betöltés"
        className="spinner"
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          border: "2px solid var(--border)",
          borderTopColor: "var(--text-muted)",
          animation: "spin 0.9s linear infinite",
          marginTop: 8,
        }}
      />
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );

  return (
    <Shell title="Álom összkép" space="dream">
      {loading ? (
        Spinner
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : !session ? (
        Spinner
      ) : (
        <div className="stack">
          <div className="meta-block">
            <span className="badge-muted">{session.status}</span>
            {session.archived_at && (
              <span className="badge-muted">
                {new Date(session.archived_at).toLocaleString("hu-HU")}
              </span>
            )}
          </div>

          <Card>
            <div className="stack-tight">
              <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
                {session.raw_dream_text}
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack-tight">
              <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
                {session.ai_framing_text ?? "—"}
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack-tight">
              {workBlocks.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>Még nincsenek kártyák.</p>
              ) : (
                <ul style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
                  {workBlocks.map((b) => (
                    <li key={b.id} style={{ opacity: 0.85 }}>
                      {renderBlockSummary(b)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/session/${id}/work`} className="btn btn-primary">
              Feldolgozás
            </Link>
            <Link href={`/session/${id}/direction`} className="btn btn-secondary">
              Irányok
            </Link>
            <Link href="/sessions" className="btn btn-secondary">
              Vissza
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}