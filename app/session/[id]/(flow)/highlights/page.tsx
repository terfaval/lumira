"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { HighlightsPanel, type SessionHighlight } from "@/components/HighlightsPanel";
import {
  aggregateSessionSuggestions,
  normalizeKind,
  type HighlightSuggestion,
} from "@/src/domain/highlights/aggregateSessionSuggestions";
import styles from "./highlights.module.css";

export default function HighlightsStep() {
  const params = useParams();
  const rawId = (params as any)?.id;
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [highlights, setHighlights] = useState<SessionHighlight[]>([]);
  const [rejectedKeys, setRejectedKeys] = useState<string[]>([]);
  const [highlightSuggestions, setHighlightSuggestions] = useState<HighlightSuggestion[]>([]);

  useEffect(() => {
    if (!sessionId || typeof sessionId !== "string") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/highlights`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as any;
        if (cancelled) return;
        setHighlights((data?.highlights ?? []) as SessionHighlight[]);
        setRejectedKeys(Array.isArray(data?.rejected_keys) ? data.rejected_keys : []);
      } catch {
        if (!cancelled) {
          setHighlights([]);
          setRejectedKeys([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || typeof sessionId !== "string") return;
    let cancelled = false;

    (async () => {
      try {
        const uid = await requireUserId();
        const [frameRes, latentRes] = await Promise.all([
          supabase
            .from("frame_versions")
            .select("payload, created_at")
            .eq("session_id", sessionId)
            .eq("user_id", uid)
            .order("created_at", { ascending: true }),
          supabase
            .from("latent_versions")
            .select("payload, created_at")
            .eq("session_id", sessionId)
            .eq("user_id", uid)
            .order("created_at", { ascending: true }),
        ]);

        if (cancelled) return;

        const suggestions = aggregateSessionSuggestions({
          framePayloads: (frameRes.data ?? []).map((row: any) => row?.payload),
          latentPayloads: (latentRes.data ?? []).map((row: any) => row?.payload),
          catalogBySlug: null,
        });

        setHighlightSuggestions(suggestions);
      } catch {
        if (!cancelled) setHighlightSuggestions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId || typeof sessionId !== "string") {
    return <div className={styles.wrap}>Hiányzó session azonosító.</div>;
  }

  return (
    <div className={styles.wrap}>
      <HighlightsPanel
        sessionId={sessionId}
        suggestions={highlightSuggestions}
        highlights={highlights}
        rejectedKeys={rejectedKeys}
        onAdd={async ({ suggestion, kind, note }) => {
          const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/highlights`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              label: suggestion.label,
              kind: normalizeKind(kind),
              note,
              source: "suggested",
              source_ref: {
                suggestion_key: suggestion.suggestion_key,
                origin: suggestion.source,
                slug: suggestion.slug ?? null,
                ref: suggestion.source_ref ?? null,
              },
            }),
          });
          if (!res.ok) throw new Error("Nem sikerült menteni a kiemelést.");
          const data = (await res.json()) as any;
          const next = data?.highlight as SessionHighlight | undefined;
          if (next?.id) {
            setHighlights((prev) => {
              const filtered = prev.filter((h) => h.id !== next.id);
              return [...filtered, next];
            });
            setRejectedKeys((prev) => prev.filter((k) => k !== suggestion.suggestion_key));
          }
        }}
        onReject={async (suggestionKey) => {
          const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/highlights/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ suggestion_key: suggestionKey }),
          });
          if (!res.ok) throw new Error("Nem sikerült elutasítani.");
          setRejectedKeys((prev) => (prev.includes(suggestionKey) ? prev : [...prev, suggestionKey]));
        }}
        onEdit={async (highlight) => {
          const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/highlights`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              id: highlight.id,
              label: highlight.label,
              kind: normalizeKind(highlight.kind),
              note: highlight.note ?? null,
              source: "user",
            }),
          });
          if (!res.ok) throw new Error("Nem sikerült frissíteni.");
          const data = (await res.json()) as any;
          const next = data?.highlight as SessionHighlight | undefined;
          if (next?.id) {
            setHighlights((prev) => prev.map((h) => (h.id === next.id ? next : h)));
          }
        }}
        onCreateCustom={async (payload) => {
          const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/highlights`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              label: payload.label,
              kind: normalizeKind(payload.kind),
              note: payload.note ?? null,
              source: "user",
            }),
          });
          if (!res.ok) throw new Error("Nem sikerült menteni a kiemelést.");
          const data = (await res.json()) as any;
          const next = data?.highlight as SessionHighlight | undefined;
          if (next?.id) {
            setHighlights((prev) => {
              const filtered = prev.filter((h) => h.id !== next.id);
              return [...filtered, next];
            });
          }
        }}
      />
    </div>
  );
}
