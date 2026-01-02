"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import type { DreamSession } from "@/src/lib/types";

export function DreamRawPanel({
  sessionId,
  session,
}: {
  sessionId: string;
  session?: Pick<DreamSession, "id" | "raw_dream_text" | "created_at"> | null;
}) {
  const [fetchedSession, setFetchedSession] = useState<
    Pick<DreamSession, "id" | "raw_dream_text" | "created_at"> | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySession = session?.raw_dream_text ? session : fetchedSession;

  useEffect(() => {
    let cancelled = false;

    if (session && session.raw_dream_text) return () => {};

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data: sessionData, error: fetchError } = await supabase
        .from("dream_sessions")
        .select("id, raw_dream_text, created_at")
        .eq("id", sessionId)
        .single();

      if (cancelled) return;

      if (fetchError) setError(fetchError.message);
      else setFetchedSession(sessionData as Pick<DreamSession, "id" | "raw_dream_text" | "created_at">);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [session, sessionId]);

  return (
    <div className="stack-tight">
      <div className="stack-tight">
        <p className="card-title" style={{ margin: 0 }}>
          Nyers álom
        </p>
        <p style={{ color: "var(--text-muted)" }}>A rögzített álomszöveg (változtatás nélkül).</p>
      </div>

      <div className="dream-raw-text" aria-live="polite">
        {loading && !displaySession ? "Betöltés…" : null}
        {error ? <span style={{ color: "crimson" }}>Nem sikerült betölteni az álmot.</span> : null}
        {!loading && !error ? displaySession?.raw_dream_text ?? "Nincs megjeleníthető álomszöveg." : null}
      </div>
    </div>
  );
}