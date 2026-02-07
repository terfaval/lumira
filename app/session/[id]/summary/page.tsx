"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Shell } from "@/components/Shell";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { DirectionTile } from "@/components/DirectionTile";
import { WorkCard } from "@/components/WorkCard";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCardContent } from "@/src/lib/types";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { HighlightsPanel, type SessionHighlight } from "@/components/HighlightsPanel";
import {
  aggregateSessionSuggestions,
  normalizeKind,
  type HighlightKind,
  type HighlightSuggestion,
} from "@/src/domain/highlights/aggregateSessionSuggestions";
import { indexGlossaryFromHighlight } from "@/src/domain/glossary/indexGlossaryFromHighlight";
import { requireUserId } from "@/src/lib/db";
import { huTagDir } from "@/src/lib/tags/dirTagsHu";

import styles from "./summary.module.css";

// Type for recommended direction records
type RecommendedDirection = { slug: string; why?: string; reason?: string };

// Keys for grouping directions, matching those on the direction selection page
type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";
type SortMode = "catalog" | "title_asc" | "title_desc";
type FilterFacet = "group" | "tag";
const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "catalog", label: "Katalógus szerint" },
  { value: "title_asc", label: "Cím A-Z" },
  { value: "title_desc", label: "Cím Z-A" },
];

// Helper: safely convert unknown arrays into string arrays
function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Parse recommended directions from JSON
function safeRecommendedDirections(x: unknown): RecommendedDirection[] {
  if (!Array.isArray(x)) return [];
  const out: RecommendedDirection[] = [];
  for (const item of x) {
    if (!item || typeof item !== "object") continue;
    const slug = (item as any).slug;
    const why = (item as any).why ?? (item as any).reason;
    if (typeof slug === "string" && slug.trim()) {
      out.push({
        slug: slug.trim(),
        why: typeof why === "string" ? why : undefined,
      });
    }
  }
  return out;
}

// Convert Hungarian group labels into stable keys
function groupKeyFromLabel(raw: unknown): GroupKey {
  const label = String(raw ?? "").trim().toLowerCase();
  if (label.includes("álomemlékezet")) return "memory";
  if (label.includes("érzelmi") || label.includes("testi")) return "somatic";
  if (label.includes("mintázat")) return "patterns";
  if (label.includes("jelent")) return "meaning";
  if (label.includes("kreatív")) return "creative";
  return "other";
}

// Provide CSS variable tokens for a given group key
function groupToken(k: GroupKey) {
  return { text: `--dirgroup-${k}` as const, bg: `--dirgroup-${k}-bg` as const };
}

// Normalize group label: fall back to “Egyéb” if empty
function groupLabel(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s || "Egyéb";
}

// Determine ordering of groups in UI
function groupOrderKey(k: GroupKey): number {
  const order: GroupKey[] = ["memory", "somatic", "patterns", "meaning", "creative", "other"];
  const idx = order.indexOf(k);
  return idx === -1 ? 999 : idx;
}

type SessionRow = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  title?: string | null;
};

type FramePayload = {
  title?: string | null;
  framing_text?: string | null;
  recommended_directions?: unknown;
};

type LatentPayload = {
  salient_elements?: unknown;
};

type SessionSummaryDTO = {
  session: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    title_override: string | null;
  } | null;
  raw_entry: string | null;
  frame: FramePayload | null;
  latent: LatentPayload | null;
  work_versions: Array<{ id: string; created_at: string; payload: any }>;
  dream_answers: WorkAnswerRow[];
  selected_directions: string[];
  catalog: DirectionCatalogItemDTO[];
};

// Compute a compact title for a session based on overrides, frame payload or raw text
function titleOf(session: SessionRow | null, framePayload: FramePayload | null, rawEntry: string | null): string {
  const override = String(session?.title ?? "").trim();
  if (override) return override;

  const framed = String(framePayload?.title ?? "").trim();
  if (framed) return framed;

  const raw = String(rawEntry ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "Cím nélküli álom";
  return raw.length > 42 ? raw.slice(0, 41) + "…" : raw;
}

// Check if block content is a direction card
function isDirectionCard(content: unknown): content is DirectionCardContent {
  if (!content || typeof content !== "object") return false;
  return (content as any).kind === "direction_card" && typeof (content as any).direction_slug === "string";
}

type WorkAnswerRow = { work_id: string | null; content: string; created_at: string };

type DirectionWorkBlock = {
  id: string;
  created_at: string;
  updated_at: string;
  content: DirectionCardContent;
};

function buildAnswersByWorkId(rows: WorkAnswerRow[]): Map<string, WorkAnswerRow> {
  const map = new Map<string, WorkAnswerRow>();
  for (const row of rows) {
    if (!row?.work_id) continue;
    const existing = map.get(row.work_id);
    if (!existing) {
      map.set(row.work_id, row);
      continue;
    }
    const existingTs = Date.parse(existing.created_at ?? "");
    const nextTs = Date.parse(row.created_at ?? "");
    if (Number.isFinite(nextTs) && (!Number.isFinite(existingTs) || nextTs >= existingTs)) {
      map.set(row.work_id, row);
    }
  }
  return map;
}

function normalizeContent(content: DirectionCardContent): DirectionCardContent {
  return {
    ...content,
    user: {
      ...content.user,
      answer: content.user?.answer ?? null,
      answered_at: content.user?.answered_at ?? null,
    },
    sequence: content.sequence ?? 0,
    state: content.state ?? "open",
    ai: {
      ...content.ai,
      context: content.ai?.context ?? null,
      prompt: content.ai?.prompt ?? null,
      question: content.ai?.question ?? null,
    },
  };
}

function applyAnswerToContent(content: DirectionCardContent, answer: WorkAnswerRow | null): DirectionCardContent {
  const normalized = normalizeContent(content);
  if (!answer?.content) return normalized;
  return {
    ...normalized,
    state: "answered",
    user: {
      ...normalized.user,
      answer: answer.content,
      answered_at: answer.created_at ?? null,
    },
  };
}

type EntryHighlight = {
  id: string;
  start_offset: number;
  end_offset: number;
  text: string;
  category: string;
  note: string | null;
  glossary_term_id?: string | null;
};

type GlossaryTermOption = {
  id: string;
  label: string;
};

function renderEntryHighlights(text: string, highlights: EntryHighlight[], className: string): ReactNode {
  if (!highlights.length) return text;

  const sorted = highlights
    .map((h) => ({
      ...h,
      start_offset: Math.max(0, Math.min(h.start_offset, text.length)),
      end_offset: Math.max(0, Math.min(h.end_offset, text.length)),
    }))
    .filter((h) => h.end_offset > h.start_offset)
    .sort((a, b) => a.start_offset - b.start_offset);

  const out: ReactNode[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start_offset < cursor) continue;
    if (h.start_offset > cursor) out.push(text.slice(cursor, h.start_offset));
    out.push(
      <mark key={`${h.id}-${h.start_offset}`} className={className} data-category={h.category}>
        {text.slice(h.start_offset, h.end_offset)}
      </mark>
    );
    cursor = h.end_offset;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

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

function toWorkBlock(row: any, answersByWorkId: Map<string, WorkAnswerRow>): DirectionWorkBlock | null {
  if (!row || typeof row !== "object") return null;
  const rawContent = (row as any).payload ?? null;
  if (!rawContent || typeof rawContent !== "object") return null;

  if (!isDirectionCard(rawContent)) return null;

  const answer = answersByWorkId.get((row as any).id ?? "");
  const content = applyAnswerToContent(rawContent as DirectionCardContent, answer ?? null);

  return {
    id: (row as any).id,
    created_at: (row as any).created_at,
    updated_at: (row as any).created_at,
    content,
  };
}

export default function SessionSummary() {
  const params = useParams();
  const router = useRouter();
  const { loading } = useRequireAuth();

  // Robust session id extraction
  const rawId = (params as any)?.id;
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [framePayload, setFramePayload] = useState<FramePayload | null>(null);
  const [latentPayload, setLatentPayload] = useState<LatentPayload | null>(null);
  const [rawEntry, setRawEntry] = useState<string | null>(null);
  const [rawEntryId, setRawEntryId] = useState<string | null>(null);

  const [workBlocks, setWorkBlocks] = useState<DirectionWorkBlock[]>([]);
  const [directionCatalog, setDirectionCatalog] = useState<DirectionCatalogItemDTO[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<Record<string, boolean>>({});
  const [showRest, setShowRest] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<GroupKey[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("catalog");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeFacet, setActiveFacet] = useState<FilterFacet>("group");

  const [err, setErr] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const [entryHighlights, setEntryHighlights] = useState<EntryHighlight[]>([]);
  const [rejectedKeys, setRejectedKeys] = useState<string[]>([]);
  const [highlightSuggestions, setHighlightSuggestions] = useState<HighlightSuggestion[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTermOption[]>([]);

  // Title edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load session, frame, work blocks and directions on mount
  useEffect(() => {
    if (!sessionId || typeof sessionId !== "string") return;

    let isMounted = true;

    (async () => {
      try {
        setErr(null);
        const res = await fetch(`/api/session-summary?session_id=${encodeURIComponent(sessionId)}`, {
          credentials: "include",
        });

        if (!res.ok) {
          let detail = "Hiba történt az összkép betöltésekor.";
          try {
            const data = (await res.json()) as any;
            detail = data?.message || data?.error || detail;
          } catch {
            // ignore JSON parse errors
          }
          throw new Error(detail);
        }

        const dto = (await res.json()) as SessionSummaryDTO;
        if (!isMounted) return;

        const nextSession = dto.session
          ? {
              id: dto.session.id,
              status: dto.session.status,
              created_at: dto.session.created_at,
              updated_at: dto.session.updated_at,
              title: dto.session.title_override ?? null,
            }
          : null;

        setSession(nextSession);
        setRawEntry(dto.raw_entry ?? null);
        setFramePayload(dto.frame ?? null);
        setLatentPayload(dto.latent ?? null);

        const answersByWorkId = buildAnswersByWorkId((dto.dream_answers ?? []) as WorkAnswerRow[]);
        const blocks = (dto.work_versions ?? [])
          .map((row: any) => toWorkBlock(row, answersByWorkId))
          .filter((b): b is DirectionWorkBlock => Boolean(b));
        setWorkBlocks(blocks);

        const sel: Record<string, boolean> = {};
        (dto.selected_directions ?? []).forEach((slug) => {
          if (typeof slug === "string") sel[slug] = true;
        });
        setSelectedDirs(sel);

        setDirectionCatalog(dto.catalog ?? []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba történt az összkép betöltésekor.";
        if (!isMounted) return;
        setErr(message);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

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
          if (typeof data.content === "string") setRawEntry(data.content);
        }
      } catch {
        // ignore
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
          .filter((row: GlossaryTermOption) => row.id && row.label)
          .sort((a: GlossaryTermOption, b: GlossaryTermOption) => a.label.localeCompare(b.label));

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

        const catalogBySlug = new Map<string, { title?: string | null }>();
        for (const item of directionCatalog ?? []) {
          if (item?.slug) catalogBySlug.set(item.slug, { title: item.title ?? null });
        }

        const suggestions = aggregateSessionSuggestions({
          framePayloads: (frameRes.data ?? []).map((row: any) => row?.payload),
          latentPayloads: (latentRes.data ?? []).map((row: any) => row?.payload),
          catalogBySlug,
        });

        setHighlightSuggestions(suggestions);
      } catch {
        if (!cancelled) setHighlightSuggestions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, directionCatalog]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!toolbarRef.current) return;
      if (!toolbarRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setSortOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const title = useMemo(() => titleOf(session, framePayload, rawEntry), [session, framePayload, rawEntry]);

  // Keep draft title in sync (unless editing)
  useEffect(() => {
    if (editingTitle) return;
    setDraftTitle(title);
  }, [title, editingTitle]);

  const saveTitle = useCallback(async () => {
    const next = (draftTitle ?? "").trim();

    try {
      setSavingTitle(true);
      setErr(null);

      const userId = await requireUserId();
      const { error } = await supabase
        .from("dream_sessions")
        .update({ title: next || null })
        .eq("id", sessionId)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);

      setSession((prev) => (prev ? { ...prev, title: next || null } : prev));
      setEditingTitle(false);
    } catch (e) {
      console.error(e);
      setErr("Nem sikerült elmenteni a címet.");
    } finally {
      setSavingTitle(false);
    }
  }, [draftTitle, sessionId]);

  const deleteSession = useCallback(async () => {
    if (!sessionId || typeof sessionId !== "string") return;
    if (deleting) return;

    const ok = window.confirm(
      "Biztosan törlöd ezt az álmot? A teljes session és minden kapcsolódó adat végleg törlődik."
    );
    if (!ok) return;

    try {
      setDeleting(true);
      setErr(null);

      const res = await fetch("/api/session/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        let detail = "Nem sikerült törölni a sessiont.";
        try {
          const data = (await res.json()) as any;
          detail = data?.message || data?.error || detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(detail);
      }

      router.replace("/archive");
      router.refresh();
    } catch (e) {
      console.error(e);
      setErr("Nem sikerült törölni a sessiont.");
    } finally {
      setDeleting(false);
    }
  }, [deleting, router, sessionId]);

  // Build a slug→catalog map for quick lookups
  const catalogBySlug = useMemo(() => {
    const m = new Map<string, DirectionCatalogItemDTO>();
    for (const d of directionCatalog) m.set(d.slug, d);
    return m;
  }, [directionCatalog]);

  const workBlockById = useMemo(() => {
    const m = new Map<string, DirectionWorkBlock>();
    for (const b of workBlocks) m.set(b.id, b);
    return m;
  }, [workBlocks]);

  const framing = framePayload?.framing_text ?? null;
  const rawText = String(rawEntry ?? "");
  const rawHighlighted = useMemo(
    () => renderEntryHighlights(rawText, entryHighlights, styles.rawHighlight),
    [rawText, entryHighlights]
  );
  const highlights = useMemo<SessionHighlight[]>(
    () =>
      entryHighlights.map((h) => ({
        id: h.id,
        label: h.text,
        kind: highlightKindFromCategory(h.category),
        note: h.note ?? null,
        source: "user",
        source_ref: null,
      })),
    [entryHighlights]
  );

  const salientElements = useMemo(() => {
    const raw = latentPayload?.salient_elements;
    if (!Array.isArray(raw)) return [];
    const out: Array<{ key: string; label: string }> = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const key = typeof (item as any).key === "string" ? (item as any).key.trim() : "";
      const label = typeof (item as any).label === "string" ? (item as any).label.trim() : "";
      const text = label || key;
      if (!text) continue;
      out.push({ key: key || text, label: text });
      if (out.length >= 5) break;
    }
    return out;
  }, [latentPayload]);

  const dreamLength = useMemo(() => {
    const raw = String(rawEntry ?? "").trim();
    const chars = raw.length;
    const words = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
    return { chars, words };
  }, [rawEntry]);

  // Stats
  const stats = useMemo(() => {
    const total = workBlocks.length;
    let answered = 0;

    const directions = new Set<string>();

    for (const b of workBlocks) {
      if (!isDirectionCard(b.content)) continue;
      const c: any = b.content;
      const state = c.state ?? "open";
      const answer = c.user?.answer ?? null;
      const isAnswered = state === "answered" || !!answer;
      if (isAnswered) answered++;
      if (typeof c.direction_slug === "string" && c.direction_slug) directions.add(c.direction_slug);
    }

    return { total, answered, directions: directions.size };
  }, [workBlocks]);

  // Gallery cards: answered (newest first), then open (newest first)
  const cardsForGallery = useMemo(() => {
    const cards = workBlocks
      .filter((b) => isDirectionCard(b.content))
      .map((b) => {
        const c: any = b.content;
        const state = c.state ?? "open";
        const answer = c.user?.answer ?? null;
        const question = c.ai?.prompt ?? c.ai?.question ?? "";
        const directionSlug = c.direction_slug ?? "";
        const created = new Date(b.created_at).getTime();
        const updated = new Date(b.updated_at ?? b.created_at).getTime();
        const isAnswered = state === "answered" || !!answer;

        return {
          id: b.id,
          created,
          updated,
          state,
          isAnswered,
          answer,
          question,
          directionSlug,
        };
      });

    const answered = cards.filter((x) => x.isAnswered).sort((a, b) => b.updated - a.updated);
    const open = cards.filter((x) => !x.isAnswered).sort((a, b) => b.created - a.created);

    return [...answered, ...open];
  }, [workBlocks]);

  const recommendedRaw = useMemo(() => safeRecommendedDirections(framePayload?.recommended_directions), [framePayload]);

  // why map for ★ recommended tiles
  const whyBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of recommendedRaw) {
      const slug = String(r.slug ?? "").trim();
      const why = String(r.why ?? "").trim();
      if (slug && why) m.set(slug, why);
    }
    return m;
  }, [recommendedRaw]);

  const groupOptions = useMemo(() => {
    const map = new Map<GroupKey, string>();
    for (const d of directionCatalog) {
      const key = groupKeyFromLabel(d.content.group);
      if (!map.has(key)) map.set(key, groupLabel(d.content.group));
    }
    const keys = Array.from(map.keys()).sort((a, b) => groupOrderKey(a) - groupOrderKey(b));
    return keys.map((key) => ({ key, label: map.get(key) ?? groupLabel(key) }));
  }, [directionCatalog]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of directionCatalog) {
      safeStringArray(d.tags).forEach((t) => set.add(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"));
  }, [directionCatalog]);

  // Compute recommended directions: prefer frame suggestions if available; filter out selected
  const recommendedDirs = useMemo(() => {
    const notSelected = directionCatalog.filter((d) => !selectedDirs[d.slug]);

    const orderedAll = [...notSelected].sort((a, b) => {
      const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (d !== 0) return d;
      return String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");
    });

    const suggested = recommendedRaw.map((r) => r.slug).filter((s) => s && !selectedDirs[s]);
    const slugs = suggested.slice(0, 3);

    if (slugs.length > 0) {
      const bySlug = new Map<string, DirectionCatalogItemDTO>();
      orderedAll.forEach((d) => bySlug.set(d.slug, d));
      const picked = slugs
        .map((s) => bySlug.get(s))
        .filter((d): d is DirectionCatalogItemDTO => !!d)
        .slice(0, 3);
      if (picked.length > 0) return picked;
    }

    return orderedAll.slice(0, 3);
  }, [directionCatalog, recommendedRaw, selectedDirs]);

  // Compute rest directions (not selected and not in recommended)
  const restCandidates = useMemo(() => {
    const recSet = new Set(recommendedDirs.map((d) => d.slug));
    return directionCatalog.filter((d) => !selectedDirs[d.slug] && !recSet.has(d.slug));
  }, [directionCatalog, recommendedDirs, selectedDirs]);

  const restDirs = useMemo(() => {
    let out = restCandidates;

    if (selectedGroups.length) {
      const gSet = new Set(selectedGroups);
      out = out.filter((d) => gSet.has(groupKeyFromLabel(d.content.group)));
    }

    if (selectedTags.length) {
      const tSet = new Set(selectedTags);
      out = out.filter((d) => safeStringArray(d.tags).some((t) => tSet.has(t)));
    }

    if (sortMode === "title_asc") {
      return [...out].sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu"));
    }

    if (sortMode === "title_desc") {
      return [...out].sort((a, b) => String(b.title ?? "").localeCompare(String(a.title ?? ""), "hu"));
    }

    const buckets = new Map<GroupKey, DirectionCatalogItemDTO[]>();
    for (const k of ["memory", "somatic", "patterns", "meaning", "creative", "other"] as GroupKey[]) {
      buckets.set(k, []);
    }

    for (const d of out) {
      const gKey = groupKeyFromLabel(d.content.group);
      buckets.get(gKey)!.push(d);
    }

    const flattened: DirectionCatalogItemDTO[] = [];
    const keys = Array.from(buckets.keys()).sort((a, b) => groupOrderKey(a) - groupOrderKey(b));

    for (const k of keys) {
      const items = (buckets.get(k) ?? []).sort((a, b) => {
        const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (d !== 0) return d;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");
      });
      flattened.push(...items);
    }

    return flattened;
  }, [restCandidates, selectedGroups, selectedTags, sortMode]);

  const activeFilterCount = selectedGroups.length + selectedTags.length;
  const selectedGroupSet = useMemo(() => new Set(selectedGroups), [selectedGroups]);
  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  function toggleGroup(key: GroupKey) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return Array.from(next);
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return Array.from(next);
    });
  }

  // Handle starting a new direction (tile click)
  const handleStartDirection = useCallback(
    async (slug: string) => {
      setErr(null);
      try {
        const result = await startDirection(sessionId, slug);
        if (!result.success) {
          setErr(result.error ?? "Hiba történt az irány indítása során.");
          return;
        }
        setSelectedDirs((prev) => ({ ...prev, [slug]: true }));
        const nextUrl = result.nextUrl ?? `/session/${sessionId}/work?direction=${encodeURIComponent(slug)}`;
        router.push(nextUrl);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Hiba történt az irány indítása során.";
        setErr(message);
      }
    },
    [sessionId, router]
  );

  function renderDirTile(d: DirectionCatalogItemDTO, opts?: { showReco?: boolean }) {
    const gRaw = d.content.group;
    const gKey = groupKeyFromLabel(gRaw);
    const gLabel = groupLabel(gRaw);
    const token = groupToken(gKey);
    const tags = safeStringArray(d.tags).slice(0, 2);

    const showReco = Boolean(opts?.showReco);
    const why = showReco ? (whyBySlug.get(d.slug) ?? null) : null;

    return (
      <DirectionTile
        key={d.slug}
        dir={d as any}
        groupKey={gKey}
        groupLabel={gLabel}
        token={token as any}
        tags={tags}
        showHint={false}
        showTags={false}
        showReco={showReco}
        why={why}
        onOpen={(slug) => handleStartDirection(slug)}
      />
    );
  }

  const shellTitle = title || "Álom összkép";

  return (
    <Shell
      title={shellTitle}
      space="dream"
      headerActions={
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerDeleteBtn}
            aria-label="Álom törlése"
            onClick={deleteSession}
            disabled={deleting || loading || !session}
            title="Álom törlése"
          >
            Törlés
          </button>
          <button
            type="button"
            className={styles.headerEditBtn}
            aria-label="Cím szerkesztése"
            onClick={() => setEditingTitle(true)}
            disabled={savingTitle || loading || !session}
            title="Cím szerkesztése"
          >
            ✎
          </button>
        </div>
      }
      surface="none"
    >
      {/* Fix back button */}
      <button type="button" className={styles.backBtn} aria-label="Vissza az álomnaplóhoz" onClick={() => router.push("/archive")}>
        ←
      </button>

      {/* Title edit overlay */}
      {editingTitle ? (
        <div className={styles.titleEditOverlay} role="dialog" aria-label="Cím szerkesztése">
          <GlassCardSurface className={styles.titleEditCard} variant="soft" paper="evening">
            <div className={styles.titleEditLabel}>Cím szerkesztése</div>

            <GlassCardMatte padding="sm" tone="evening">
              <input
                className={styles.titleEditInput}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setDraftTitle(title);
                    setEditingTitle(false);
                  }
                }}
              />
            </GlassCardMatte>

            <div className={styles.titleEditActions}>
              <button
                type="button"
                className={styles.titleEditBtn}
                onClick={() => {
                  setDraftTitle(title);
                  setEditingTitle(false);
                }}
                disabled={savingTitle}
              >
                Mégse
              </button>
              <button type="button" className={styles.titleEditBtnPrimary} onClick={saveTitle} disabled={savingTitle}>
                {savingTitle ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </GlassCardSurface>
        </div>
      ) : null}

      <FullScreenLoadingOverlay open={loading && !session} title="Betöltés…" />
      <FullScreenLoadingOverlay open={deleting} title="Törlés…" />

      <div className={styles.summaryWrap}>
        {err ? <p style={{ color: "crimson", margin: 0 }}>{err}</p> : null}

        {!session ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--text-muted)" }}>{loading ? "Betöltés…" : "Nem található session."}</span>
          </div>
        ) : (
          <>
            <div className={styles.summaryHeader}>
              <div className={styles.summaryHeaderLeft}>
                <div className={styles.textCard}>
                  <div className={styles.textCardHeader}>Nyers álom</div>
                  <div className={styles.glassPanel}>
                    <div className={styles.glassInner}>
                      <div className={styles.textBlock}>{rawHighlighted || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.summaryHeaderRight}>
                <HighlightsPanel
                  sessionId={sessionId}
                  suggestions={highlightSuggestions}
                  highlights={highlights}
                  rejectedKeys={rejectedKeys}
                  glossaryTerms={glossaryTerms}
                  allowLabelEdit={false}
                  onAdd={async ({ suggestion, kind, note, glossaryTermId }) => {
                    const entryId = rawEntryId;
                    const content = rawText;
                    if (!entryId || !content) throw new Error("Hiányzik a nyers álom szövege.");

                    const match = findFirstMatch(content, suggestion.label);
                    if (!match) throw new Error("Nem találom a szövegben ezt a részt.");

                    const uid = await requireUserId();
                    const category = categoryFromKind(normalizeKind(kind));

                    const payload = {
                      user_id: uid,
                      session_id: sessionId,
                      entry_id: entryId,
                      start_offset: match.start,
                      end_offset: match.end,
                      text: match.snippet,
                      category,
                      note: note ?? null,
                      glossary_term_id: glossaryTermId ?? null,
                    };

                    const { data, error } = await supabase
                      .from("dream_entry_highlights")
                      .insert(payload)
                      .select("id, entry_id, start_offset, end_offset, text, category, note, glossary_term_id, created_at")
                      .maybeSingle();

                    if (error) throw new Error(error.message);
                    if (data) setEntryHighlights((prev) => [...prev, data as EntryHighlight]);

                    await supabase
                      .from("dream_session_rejected_suggestions")
                      .delete()
                      .eq("session_id", sessionId)
                      .eq("user_id", uid)
                      .eq("suggestion_key", suggestion.suggestion_key);
                    setRejectedKeys((prev) => prev.filter((k) => k !== suggestion.suggestion_key));

                    const glossary = await indexGlossaryFromHighlight({
                      supabase,
                      userId: uid,
                      sessionId,
                      label: match.snippet,
                      source: "user_note",
                      rawText: content,
                      glossaryTermId: glossaryTermId ?? null,
                    });

                    if (glossary.matched_term_id && data?.id && data?.glossary_term_id !== glossary.matched_term_id) {
                      const { data: linked } = await supabase
                        .from("dream_entry_highlights")
                        .update({ glossary_term_id: glossary.matched_term_id })
                        .eq("id", data.id)
                        .eq("user_id", uid)
                        .select("id, glossary_term_id")
                        .maybeSingle();

                      if (linked?.id) {
                        setEntryHighlights((prev) =>
                          prev.map((h) => (h.id === linked.id ? { ...h, glossary_term_id: linked.glossary_term_id } : h))
                        );
                      }
                    }
                  }}
                  onReject={async (suggestionKey) => {
                    const res = await fetch(
                      `/api/sessions/${encodeURIComponent(sessionId)}/highlights/reject`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ suggestion_key: suggestionKey }),
                      }
                    );
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
                    const content = rawText;
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

                    const glossary = await indexGlossaryFromHighlight({
                      supabase,
                      userId: uid,
                      sessionId,
                      label: match.snippet,
                      source: "user_note",
                      rawText: content,
                    });

                    if (glossary.matched_term_id && data?.id && data?.glossary_term_id !== glossary.matched_term_id) {
                      const { data: linked } = await supabase
                        .from("dream_entry_highlights")
                        .update({ glossary_term_id: glossary.matched_term_id })
                        .eq("id", data.id)
                        .eq("user_id", uid)
                        .select("id, glossary_term_id")
                        .maybeSingle();

                      if (linked?.id) {
                        setEntryHighlights((prev) =>
                          prev.map((h) => (h.id === linked.id ? { ...h, glossary_term_id: linked.glossary_term_id } : h))
                        );
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className={styles.rawSection}>
              <div className={styles.textCardHeader}>AI összefoglaló</div>
              <div className={styles.glassPanel}>
                <div className={styles.glassInner}>
                  <div className={styles.textBlock}>{framing ?? "—"}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <GlassCardSurface className={`${styles.statsItem} ${styles.gridCard}`} variant="flat" paper="evening">
                <div className={`${styles.statsLabel} ${styles.gridCardHeader}`}>Álom hossza</div>
                <div className={`${styles.statsValue} ${styles.gridCardBody}`}>
                  {dreamLength.chars} karakter · {dreamLength.words} szó
                </div>
              </GlassCardSurface>

              <GlassCardSurface className={`${styles.statsItem} ${styles.gridCard}`} variant="flat" paper="evening">
                <div className={`${styles.statsLabel} ${styles.gridCardHeader}`}>Rögzített kártyák</div>
                <div className={`${styles.statsValue} ${styles.gridCardBody}`}>
                  {stats.answered}/{stats.total}
                </div>
              </GlassCardSurface>

              <GlassCardSurface className={`${styles.statsItem} ${styles.gridCard}`} variant="flat" paper="evening">
                <div className={`${styles.statsLabel} ${styles.gridCardHeader}`}>Érintett irányok</div>
                <div className={`${styles.statsValue} ${styles.gridCardBody}`}>{stats.directions}</div>
              </GlassCardSurface>
            </div>

            {salientElements.length > 0 ? (
              <div className={styles.salientSection}>
                <div className={styles.salientLabel}>Kiemelt elemek</div>
                <div className={styles.salientPills}>
                  {salientElements.map((item) => (
                    <span key={item.key} className={styles.salientPill}>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Gallery */}
            <div className={styles.gallerySection}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Kártyák</h2>

                <button
                  type="button"
                  className={styles.continueBtn}
                  onClick={() => router.push(`/session/${sessionId}/work`)}
                  aria-label="Folytatás"
                  title="Folytatás"
                >
                  +
                </button>
              </div>

              {cardsForGallery.length === 0 ? (
                <div className={styles.emptyHint}>Még nincs rögzített kártya ebben az álomban.</div>
              ) : (
                <div className={styles.carousel} aria-label="Kártyák galéria">
                  {cardsForGallery.map((c, idx) => {
                    const meta = catalogBySlug.get(c.directionSlug);

                    const full = workBlockById.get(c.id);
                    if (!full) return null;

                    return (
  <div
    key={c.id}
    className={styles.cardItem}
    style={{
      transform: `translateY(${idx % 2 === 0 ? 0 : 8}px)`,
    }}
    
  >
    <WorkCard
      mode="read"
      busy={false}
      directionMeta={meta ?? null}
      block={{
      id: c.id,
      content: (workBlockById.get(c.id)?.content ?? null) as any,
    }}
    onOpen={() => {
      const url = c.directionSlug
        ? `/session/${sessionId}/work?direction=${encodeURIComponent(c.directionSlug)}`
        : `/session/${sessionId}/work`;
      router.push(url);
      }}
    />
  </div>
);
                  })}
                </div>
              )}
            </div>

            {/* Recommended directions */}
            <div className={styles.recommendSection}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>Ajánlott irányok</h2>
              <div className={styles.dirGrid}>{recommendedDirs.map((d) => renderDirTile(d, { showReco: true }))}</div>
            </div>

            {/* Show rest directions toggle */}
            {restDirs.length > 0 && !showRest ? (
              <div style={{ textAlign: "center" }}>
                <button className={styles.moreButton} onClick={() => setShowRest(true)}>
                  Más irányt keresek
                </button>
              </div>
            ) : null}

            {/* Rest directions list */}
            {showRest && restDirs.length > 0 ? (
              <div className={styles.recommendSection} style={{ marginTop: "var(--space-3)" }}>
                <h2 style={{ margin: 0, fontSize: "20px" }}>További irányok</h2>
                <div className={styles.toolbar} ref={toolbarRef}>
                  <div className={styles.toolbarActions}>
                    <button
                      type="button"
                      className={styles.toolbarBtn}
                      aria-expanded={filterOpen}
                      onClick={() => {
                        setFilterOpen((v) => !v);
                        setSortOpen(false);
                      }}
                    >
                      Szűrés{activeFilterCount ? ` (${activeFilterCount})` : ""}
                    </button>
                    <button
                      type="button"
                      className={styles.toolbarBtn}
                      aria-expanded={sortOpen}
                      onClick={() => {
                        setSortOpen((v) => !v);
                        setFilterOpen(false);
                      }}
                    >
                      Rendezés
                    </button>
                  </div>

                  {filterOpen && (
                    <div className={styles.toolbarPanel} role="dialog" aria-label="Szűrés">
                      <div className={styles.panelBody}>
                        <div className={styles.panelList}>
                          <button
                            type="button"
                            className={`${styles.panelOption}${activeFacet === "group" ? ` ${styles.panelOptionActive}` : ""}`}
                            onClick={() => setActiveFacet("group")}
                          >
                            Csoport
                          </button>
                          <button
                            type="button"
                            className={`${styles.panelOption}${activeFacet === "tag" ? ` ${styles.panelOptionActive}` : ""}`}
                            onClick={() => setActiveFacet("tag")}
                          >
                            Címkék
                          </button>
                        </div>

                        <div className={styles.panelPills}>
                          {activeFacet === "group" && (
                            <>
                              <button
                                type="button"
                                className={`${styles.pillBtn}${selectedGroups.length === 0 ? ` ${styles.pillBtnActive}` : ""}`}
                                aria-pressed={selectedGroups.length === 0}
                                onClick={() => setSelectedGroups([])}
                              >
                                Mind
                              </button>
                              {groupOptions.map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  className={`${styles.pillBtn}${selectedGroupSet.has(opt.key) ? ` ${styles.pillBtnActive}` : ""}`}
                                  aria-pressed={selectedGroupSet.has(opt.key)}
                                  onClick={() => toggleGroup(opt.key)}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </>
                          )}

                          {activeFacet === "tag" && (
                            <>
                              <button
                                type="button"
                                className={`${styles.pillBtn}${selectedTags.length === 0 ? ` ${styles.pillBtnActive}` : ""}`}
                                aria-pressed={selectedTags.length === 0}
                                onClick={() => setSelectedTags([])}
                              >
                                Mind
                              </button>
                              {tagOptions.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  className={`${styles.pillBtn}${selectedTagSet.has(tag) ? ` ${styles.pillBtnActive}` : ""}`}
                                  aria-pressed={selectedTagSet.has(tag)}
                                  onClick={() => toggleTag(tag)}
                                >
                                  {huTagDir(tag)}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {sortOpen && (
                    <div className={styles.toolbarPanel} role="dialog" aria-label="Rendezés">
                      <div className={styles.panelPills}>
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`${styles.pillBtn}${sortMode === opt.value ? ` ${styles.pillBtnActive}` : ""}`}
                            aria-pressed={sortMode === opt.value}
                            onClick={() => setSortMode(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.dirGrid}>{restDirs.map((d) => renderDirTile(d))}</div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Shell>
  );
}
