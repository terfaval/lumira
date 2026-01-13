"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import type { DreamSession } from "@/src/lib/types";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

type DreamRaw = Pick<DreamSession, "id" | "raw_dream_text" | "created_at">;

export function DreamRawPanel({
  sessionId,
  session,
  variant = "default",
  className = "",
}: {
  sessionId: string;
  session?: DreamRaw | null;
  /** default: a régi viselkedés, bare: semmi extra “doboz” styling */
  variant?: "default" | "bare";
  className?: string;
}) {
  const [fetchedSession, setFetchedSession] = useState<DreamRaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySession = useMemo(() => {
    return session?.raw_dream_text ? session : fetchedSession;
  }, [session, fetchedSession]);

  useEffect(() => {
    let cancelled = false;
    if (session && session.raw_dream_text) return;

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
      else setFetchedSession(sessionData as DreamRaw);

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [session, sessionId]);

  const text =
    loading && !displaySession
      ? "Betöltés…"
      : error
        ? null
        : displaySession?.raw_dream_text ?? "Nincs megjeleníthető álomszöveg.";

  const rootClass =
    variant === "bare"
      ? `dream-raw-text dream-raw-text--bare ${className}`.trim()
      : `dream-raw-text ${className}`.trim();

  if (variant === "bare") {
    return (
      <div className={rootClass} aria-live="polite">
        {error ? <span style={{ color: "crimson" }}>Nem sikerült betölteni az álmot.</span> : null}
        {!error ? text : null}
      </div>
    );
  }

  return (
    <GlassCardSurface className={rootClass} aria-live="polite" variant="soft" paper="plain">
      {error ? <span style={{ color: "crimson" }}>Nem sikerült betölteni az álmot.</span> : null}
      {!error ? text : null}
    </GlassCardSurface>
  );
}