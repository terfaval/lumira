"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { HighlightsPanel, type SessionHighlight } from "@/components/HighlightsPanel";
import {
  aggregateSessionSuggestions,
  normalizeKind,
  type HighlightKind,
  type HighlightSuggestion,
} from "@/src/domain/highlights/aggregateSessionSuggestions";
import { indexGlossaryFromHighlight } from "@/src/domain/glossary/indexGlossaryFromHighlight";
import { pinHighlightToLexikon } from "@/src/domain/glossary/pinHighlightToLexikon";
import styles from "./highlights.module.css";

type EntryHighlight = {
  id: string;
  entry_id: string;
  start_offset: number;
  end_offset: number;
  text: string;
  category: string;
  note: string | null;
  glossary_term_id?: string | null;
  created_at: string;
};

function highlightKindFromCategory(raw: unknown): HighlightKind {
  const k = String(raw ?? "").trim().toLowerCase();
  switch (k) {
    case "character":
      return "person";
    case "place":
      return "place";
    case "object":
      return "object";
    case "beat":
      return "action";
    case "felt_word":
      return "feeling";
    default:
      return "other";
  }
}

function categoryFromKind(raw: HighlightKind): string {
  switch (raw) {
    case "person":
      return "character";
    case "place":
      return "place";
    case "object":
      return "object";
    case "action":
    case "theme":
      return "beat";
    case "feeling":
      return "felt_word";
    default:
      return "felt_word";
  }
}

function findFirstMatch(text: string, label: string): { start: number; end: number; snippet: string } | null {
  const cleanLabel = label.trim();
  if (!cleanLabel) return null;
  const hay = text.toLowerCase();
  const needle = cleanLabel.toLowerCase();
  const start = hay.indexOf(needle);
  if (start === -1) return null;
  const end = start + cleanLabel.length;
  return { start, end, snippet: text.slice(start, end) };
}

export default function HighlightsStep() {
  const params = useParams();
  const rawId = (params as any)?.id;
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [entryHighlights, setEntryHighlights] = useState<EntryHighlight[]>([]);
  const [rawEntryId, setRawEntryId] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [rejectedKeys, setRejectedKeys] = useState<string[]>([]);
  const [highlightSuggestions, setHighlightSuggestions] = useState<HighlightSuggestion[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    if (!sessionId || typeof sessionId !== "string") return;
    let cancelled = false;

    (async () => {
      try {
        const uid = await requireUserId();
        const { data, error } = await supabase
          .from("dream_entries")
          .select("id, content")
          .eq("session_id", sessionId)
          .eq("user_id", uid)
          .eq("kind", "raw")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (error) return;
        if (data?.id) {
          setRawEntryId(data.id);
          setRawText(typeof data.content === "string" ? data.content : null);
        }
      } catch {
        if (!cancelled) {
          setRawEntryId(null);
          setRawText(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!rawEntryId) {
      setEntryHighlights([]);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const uid = await requireUserId();
        const { data, error } = await supabase
          .from("dream_entry_highlights")
          .select("id, entry_id, start_offset, end_offset, text, category, note, glossary_term_id, created_at")
          .eq("entry_id", rawEntryId)
          .eq("user_id", uid)
          .order("created_at", { ascending: true });

        if (cancelled) return;
        if (error) {
          setEntryHighlights([]);
          return;
        }
        setEntryHighlights((data as EntryHighlight[]) ?? []);
      } catch {
        if (!cancelled) setEntryHighlights([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawEntryId]);

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
        setRejectedKeys(Array.isArray(data?.rejected_keys) ? data.rejected_keys : []);
      } catch {
        if (!cancelled) {
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
        const { data, error } = await supabase
          .from("glossary_terms")
          .select("id, canonical, canonical_key, canonical_name, name, term")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          setGlossaryTerms([]);
          return;
        }

        const mapped = (data ?? [])
          .map((row: any) => {
            const label =
              (typeof row?.canonical === "string" && row.canonical.trim()) ||
              (typeof row?.canonical_name === "string" && row.canonical_name.trim()) ||
              (typeof row?.name === "string" && row.name.trim()) ||
              (typeof row?.term === "string" && row.term.trim()) ||
              (typeof row?.canonical_key === "string" && row.canonical_key.trim()) ||
              "";
            return { id: String(row?.id ?? ""), label };
          })
          .filter((row: { id: string; label: string }) => row.id && row.label)
          .sort((a: { id: string; label: string }, b: { id: string; label: string }) => a.label.localeCompare(b.label));

        setGlossaryTerms(mapped);
      } catch {
        if (!cancelled) setGlossaryTerms([]);
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

  const highlights = useMemo<SessionHighlight[]>(
    () =>
      entryHighlights.map((h) => ({
        id: h.id,
        label: h.text,
        kind: highlightKindFromCategory(h.category),
        note: h.note ?? null,
        source: "user",
        source_ref: null,
        glossary_term_id: h.glossary_term_id ?? null,
      })),
    [entryHighlights]
  );

  const handlePinToGlossary = useCallback(
    async (highlight: SessionHighlight) => {
      if (!sessionId || typeof sessionId !== "string") {
        throw new Error("Hiányzó session azonosító.");
      }

      const label = String(highlight.label ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (!label) throw new Error("Nincs rögzíthetõ szöveg.");

      const uid = await requireUserId();
      const { termId, termLabel } = await pinHighlightToLexikon({
        supabase,
        user_id: uid,
        session_id: sessionId,
        rawText,
        highlight: {
          id: highlight.id,
          label,
          kind: highlight.kind ?? "other",
          note: highlight.note ?? null,
          glossary_term_id: highlight.glossary_term_id ?? null,
        },
      });

      setEntryHighlights((prev) =>
        prev.map((h) => (h.id === highlight.id ? { ...h, glossary_term_id: termId } : h))
      );
      setGlossaryTerms((prev) => {
        if (prev.some((t) => t.id === termId)) return prev;
        const next = [...prev, { id: termId, label: termLabel }];
        next.sort((a, b) => a.label.localeCompare(b.label));
        return next;
      });
    },
    [rawText, sessionId]
  );

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
        glossaryTerms={glossaryTerms}
        onPinToGlossary={handlePinToGlossary}
        allowLabelEdit={false}
        onAdd={async ({ suggestion, kind, note, glossaryTermId }) => {
          const entryId = rawEntryId;
          const content = rawText ?? "";
          if (!entryId || !content) throw new Error("Hiányzik a nyers álom szövege.");

          const match = findFirstMatch(content, suggestion.label);
          if (!match) throw new Error("Nem találom a szövegben ezt a részt.");

          const uid = await requireUserId();
          const category = categoryFromKind(normalizeKind(kind));

          const { data, error } = await supabase
            .from("dream_entry_highlights")
            .insert({
              user_id: uid,
              session_id: sessionId,
              entry_id: entryId,
              start_offset: match.start,
              end_offset: match.end,
              text: match.snippet,
              category,
              note: note ?? null,
            })
            .select("id, entry_id, start_offset, end_offset, text, category, note, glossary_term_id, created_at")
            .maybeSingle();

          if (error) throw new Error("Nem sikerült menteni a kiemelést.");
          if (data) setEntryHighlights((prev) => [...prev, data as EntryHighlight]);

          setRejectedKeys((prev) => prev.filter((k) => k !== suggestion.suggestion_key));
          await supabase
            .from("dream_session_rejected_suggestions")
            .delete()
            .eq("session_id", sessionId)
            .eq("user_id", uid)
            .eq("suggestion_key", suggestion.suggestion_key);

          try {
            await indexGlossaryFromHighlight({
              supabase,
              userId: uid,
              sessionId,
              label: match.snippet,
              source: "user_note",
              rawText: content,
              glossaryTermId: glossaryTermId ?? null,
              allowCreate: false,
            });
          } catch {
            // best-effort only
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
          const entryId = rawEntryId;
          if (!entryId) throw new Error("Hiányzik a nyers álom.");
          const uid = await requireUserId();
          const category = categoryFromKind(normalizeKind(highlight.kind));
          const note = highlight.note ?? null;

          const { error } = await supabase
            .from("dream_entry_highlights")
            .update({ category, note })
            .eq("id", highlight.id)
            .eq("entry_id", entryId)
            .eq("user_id", uid);

          if (error) throw new Error("Nem sikerült frissíteni.");

          setEntryHighlights((prev) =>
            prev.map((h) => (h.id === highlight.id ? { ...h, category, note } : h))
          );
        }}
        onCreateCustom={async (payload) => {
          const entryId = rawEntryId;
          const content = rawText ?? "";
          if (!entryId || !content) throw new Error("Hiányzik a nyers álom szövege.");

          const match = findFirstMatch(content, payload.label);
          if (!match) throw new Error("Nem találom a szövegben ezt a részt.");

          const uid = await requireUserId();
          const category = categoryFromKind(normalizeKind(payload.kind));

          const { data, error } = await supabase
            .from("dream_entry_highlights")
            .insert({
              user_id: uid,
              session_id: sessionId,
              entry_id: entryId,
              start_offset: match.start,
              end_offset: match.end,
              text: match.snippet,
              category,
              note: payload.note ?? null,
            })
            .select("id, entry_id, start_offset, end_offset, text, category, note, glossary_term_id, created_at")
            .maybeSingle();

          if (error) throw new Error("Nem sikerült menteni a kiemelést.");
          if (data) setEntryHighlights((prev) => [...prev, data as EntryHighlight]);

          try {
            await indexGlossaryFromHighlight({
              supabase,
              userId: uid,
              sessionId,
              label: match.snippet,
              source: "user_note",
              rawText: content,
              allowCreate: false,
            });
          } catch {
            // best-effort only
          }
        }}
      />
    </div>
  );
}
