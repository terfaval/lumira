import { type HighlightKind, normalizeKind } from "@/src/domain/highlights/aggregateSessionSuggestions";
import { indexGlossaryFromHighlight } from "@/src/domain/glossary/indexGlossaryFromHighlight";
import { requireUserId } from "@/src/lib/db";
import { supabase as browserSupabase } from "@/src/lib/supabase/client";

type SupabaseLike = typeof browserSupabase;

export type EntryHighlightRow = {
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

type EntryHighlightMatch = {
  start: number;
  end: number;
  snippet: string;
};

export function categoryFromHighlightKind(raw: HighlightKind): string {
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

export function findFirstEntryHighlightMatch(text: string, label: string): EntryHighlightMatch | null {
  const cleanLabel = label.trim();
  if (!cleanLabel) return null;
  const hay = text.toLowerCase();
  const needle = cleanLabel.toLowerCase();
  const start = hay.indexOf(needle);
  if (start === -1) return null;
  const end = start + cleanLabel.length;
  return { start, end, snippet: text.slice(start, end) };
}

export function buildEntryHighlightInsertPayload(args: {
  userId: string;
  sessionId: string;
  entryId: string;
  match: EntryHighlightMatch;
  kind: HighlightKind;
  note?: string | null;
}) {
  return {
    user_id: args.userId,
    session_id: args.sessionId,
    entry_id: args.entryId,
    start_offset: args.match.start,
    end_offset: args.match.end,
    text: args.match.snippet,
    category: categoryFromHighlightKind(normalizeKind(args.kind)),
    note: args.note ?? null,
  };
}

export function buildEntryHighlightUpdatePayload(args: {
  kind: HighlightKind;
  note?: string | null;
}) {
  return {
    category: categoryFromHighlightKind(normalizeKind(args.kind)),
    note: args.note ?? null,
  };
}

export async function insertEntryHighlightFromLabel(args: {
  supabase: SupabaseLike;
  sessionId: string;
  entryId: string | null;
  rawText: string;
  label: string;
  kind: HighlightKind;
  note?: string | null;
  insertErrorMessage: string;
  includeDbInsertErrorDetail?: boolean;
}): Promise<{ userId: string; inserted: EntryHighlightRow; match: EntryHighlightMatch }> {
  if (!args.entryId || !args.rawText) {
    throw new Error("Hianyzik a nyers alom szovege.");
  }

  const match = findFirstEntryHighlightMatch(args.rawText, args.label);
  if (!match) {
    throw new Error("Nem talalom a szovegben ezt a reszt.");
  }

  const userId = await requireUserId();
  const payload = buildEntryHighlightInsertPayload({
    userId,
    sessionId: args.sessionId,
    entryId: args.entryId,
    match,
    kind: args.kind,
    note: args.note ?? null,
  });

  const { data, error } = await args.supabase
    .from("dream_entry_highlights")
    .insert(payload)
    .select("id, entry_id, start_offset, end_offset, text, category, note, glossary_term_id, created_at")
    .maybeSingle();

  if (error || !data) {
    if (error && args.includeDbInsertErrorDetail) {
      throw new Error(error.message);
    }
    throw new Error(args.insertErrorMessage);
  }

  return { userId, inserted: data as EntryHighlightRow, match };
}

export async function updateEntryHighlightFromClient(args: {
  supabase: SupabaseLike;
  highlightId: string;
  entryId: string | null;
  kind: HighlightKind;
  note?: string | null;
}): Promise<{ userId: string; update: { category: string; note: string | null } }> {
  if (!args.entryId) throw new Error("Hianyzik a nyers alom.");

  const userId = await requireUserId();
  const update = buildEntryHighlightUpdatePayload({ kind: args.kind, note: args.note ?? null });
  const { error } = await args.supabase
    .from("dream_entry_highlights")
    .update(update)
    .eq("id", args.highlightId)
    .eq("entry_id", args.entryId)
    .eq("user_id", userId);

  if (error) throw new Error("Nem sikerult frissiteni.");
  return { userId, update };
}

export async function clearRejectedSuggestionForUser(args: {
  supabase: SupabaseLike;
  sessionId: string;
  userId: string;
  suggestionKey: string;
}) {
  await args.supabase
    .from("dream_session_rejected_suggestions")
    .delete()
    .eq("session_id", args.sessionId)
    .eq("user_id", args.userId)
    .eq("suggestion_key", args.suggestionKey);
}

export async function bestEffortIndexHighlightInGlossary(args: {
  supabase: SupabaseLike;
  userId: string;
  sessionId: string;
  label: string;
  rawText: string;
  glossaryTermId?: string | null;
}) {
  try {
    await indexGlossaryFromHighlight({
      supabase: args.supabase,
      userId: args.userId,
      sessionId: args.sessionId,
      label: args.label,
      source: "user_note",
      rawText: args.rawText,
      glossaryTermId: args.glossaryTermId ?? null,
      allowCreate: false,
    });
  } catch {
    // best-effort only
  }
}
