// /app/session/[id]/page.tsx //

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { isDirectionCardContent } from "@/src/lib/types";
import { requireUserId } from "@/src/lib/db";

type SessionDetail = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

type WorkSummary = { id: string; question: string; isAnswered: boolean };

function renderBlockSummary(block: WorkSummary) {
  const question = block.question ?? "";
  return question ? `${question}${block.isAnswered ? " · rögzítve" : ""}` : block.isAnswered ? "Rögzítve" : "Kártya";
}

export default function SessionOverview() {
  const { id } = useParams<{ id: string }>();
  const { loading } = useRequireAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [rawEntry, setRawEntry] = useState<string | null>(null);
  const [framingText, setFramingText] = useState<string | null>(null);
  const [workSummaries, setWorkSummaries] = useState<WorkSummary[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from("dream_sessions")
          .select("id, status, created_at, updated_at, archived_at")
          .eq("id", id)
          .eq("user_id", userId)
          .single();
        if (error) throw error;
        setSession((data ?? null) as SessionDetail | null);

        const { data: entryRow } = await supabase
          .from("dream_entries")
          .select("content, created_at")
          .eq("session_id", id)
          .eq("user_id", userId)
          .eq("kind", "raw")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setRawEntry(typeof entryRow?.content === "string" ? entryRow.content : null);

        const { data: latestFrame } = await supabase
          .from("frame_latest")
          .select("frame_version_id")
          .eq("session_id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (latestFrame?.frame_version_id) {
          const { data: frameVersion } = await supabase
            .from("frame_versions")
            .select("payload")
            .eq("id", latestFrame.frame_version_id)
            .eq("user_id", userId)
            .maybeSingle();

          const payload = frameVersion?.payload as any;
          setFramingText(typeof payload?.framing_text === "string" ? payload.framing_text : null);
        } else {
          setFramingText(null);
        }

        const { data: versions, error: wbErr } = await supabase
          .from("work_versions")
          .select("id, session_id, user_id, payload, created_at")
          .eq("session_id", id)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (wbErr) throw wbErr;

        const { data: answers } = await supabase
          .from("dream_answers")
          .select("work_id, content, created_at")
          .eq("session_id", id)
          .eq("user_id", userId);

        const answersByWorkId = new Map<string, { content: string; created_at: string }>();
        (answers ?? []).forEach((row: any) => {
          if (!row?.work_id) return;
          const existing = answersByWorkId.get(row.work_id);
          if (!existing) {
            answersByWorkId.set(row.work_id, {
              content: String(row.content ?? ""),
              created_at: row.created_at,
            });
            return;
          }
          const existingTs = Date.parse(existing.created_at ?? "");
          const nextTs = Date.parse(row.created_at ?? "");
          if (Number.isFinite(nextTs) && (!Number.isFinite(existingTs) || nextTs >= existingTs)) {
            answersByWorkId.set(row.work_id, {
              content: String(row.content ?? ""),
              created_at: row.created_at,
            });
          }
        });

        const summaries: WorkSummary[] = (versions ?? [])
          .map((row: any) => {
            const payload = row?.payload ?? null;
            if (!isDirectionCardContent(payload)) return null;
            const answerRow = answersByWorkId.get(row.id);
            const answer = typeof answerRow?.content === "string" ? answerRow.content : "";
            const question = payload.ai?.question ?? "";
            const isAnswered = Boolean(answer) || (payload.state ?? "open") === "answered";
            return { id: row.id, question, isAnswered };
          })
          .filter((row: WorkSummary | null): row is WorkSummary => Boolean(row));

        setWorkSummaries(summaries);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Nem sikerült betölteni az összképet.";
        setErr(message);
      }
    })();
  }, [id]);

  return (
    <Shell title="Álom összkép" space="dream">
      {loading ? (
        <FullScreenLoadingOverlay open />
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : !session ? (
        <FullScreenLoadingOverlay open />
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
                {rawEntry}
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack-tight">
              <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
                {framingText ?? "—"}
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack-tight">
              {workSummaries.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>Még nincsenek kártyák.</p>
              ) : (
                <ul style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
                  {workSummaries.map((b) => (
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
