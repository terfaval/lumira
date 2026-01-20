"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";
import { requireUserId } from "@/src/lib/db";

type DreamRawEntry = {
  session_id: string;
  content: string;
  created_at: string;
};

export function DreamRawPanel({
  sessionId,
  entry,
  variant = "default",
  className = "",
}: {
  sessionId: string;
  entry?: DreamRawEntry | null;
  /** default: a régi viselkedés, bare: semmi extra “doboz” styling */
  variant?: "default" | "bare";
  className?: string;
}) {
  const [fetchedEntry, setFetchedEntry] = useState<DreamRawEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayEntry = useMemo(() => {
    return entry?.content ? entry : fetchedEntry;
  }, [entry, fetchedEntry]);

  useEffect(() => {
    let cancelled = false;
    if (entry && entry.content) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const uid = await requireUserId();

        const { data, error: fetchError } = await supabase
          .from("dream_entries")
          .select("session_id, content, created_at")
          .eq("session_id", sessionId)
          .eq("user_id", uid)
          .eq("kind", "raw")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) setError(fetchError.message);
        else setFetchedEntry((data as DreamRawEntry) ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Nem sikerült betölteni az álmot.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [entry, sessionId]);

  const showLoading = loading && !displayEntry;
  const text =
    showLoading
      ? "Betöltés…"
      : error
        ? null
        : displayEntry?.content ?? "Nincs megjeleníthető álomszöveg.";

  const rootClass =
    variant === "bare"
      ? `dream-raw-text dream-raw-text--bare ${className}`.trim()
      : `dream-raw-text ${className}`.trim();

  if (variant === "bare") {
    return (
      <div className={rootClass} aria-live="polite">
        {error ? <span style={{ color: "crimson" }}>Nem sikerült betölteni az álmot.</span> : null}
        {!error && text ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {showLoading ? <LumiraLoader size={18} spinSeconds={8} tone="light" /> : null}
            <span>{text}</span>
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <GlassCardSurface className={rootClass} aria-live="polite" variant="soft" paper="plain">
      {error ? <span style={{ color: "crimson" }}>Nem sikerült betölteni az álmot.</span> : null}
      {!error && text ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {showLoading ? <LumiraLoader size={18} spinSeconds={8} tone="light" /> : null}
          <span>{text}</span>
        </span>
      ) : null}
    </GlassCardSurface>
  );
}
