// src/domain/glossary/pinHighlightToLexikon.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { matchKeyFromLabel } from "@/src/lib/dream/huMatch";
import { normalizeKind } from "@/src/domain/highlights/aggregateSessionSuggestions";
import { countOccurrencesInText } from "@/src/domain/glossary/indexGlossaryFromHighlight";
import { upsertGlossaryOccurrences } from "@/src/db/repositories/glossaryRepo";

type SupabaseLike = any;

type PinHighlightInput = {
  supabase: SupabaseLike;
  user_id: string;
  session_id: string;
  rawText?: string | null;
  highlight: {
    id: string;
    label: string;
    kind?: string | null;
    note?: string | null;
    glossary_term_id?: string | null;
  };
};

type PinHighlightOutput = {
  termId: string;
  canonicalKey: string;
  termLabel: string;
};

export async function pinHighlightToLexikon(params: PinHighlightInput): Promise<PinHighlightOutput> {
  const user_id = String(params.user_id ?? "").trim();
  const session_id = String(params.session_id ?? "").trim();
  const highlightId = String(params.highlight?.id ?? "").trim();
  const label = String(params.highlight?.label ?? "").replace(/\s+/g, " ").trim();
  if (!user_id || !session_id || !highlightId || !label) {
    throw new Error("missing_fields");
  }

  const canonicalKey = matchKeyFromLabel(label) || anchorKey(label);
  if (!canonicalKey) {
    throw new Error("canonical_key_failed");
  }

  const kind = normalizeKind(params.highlight?.kind ?? "other");
  const note = typeof params.highlight?.note === "string" ? params.highlight.note.trim() : "";

  let termId = "";
  let termLabel = label;

  const existingRes = await params.supabase
    .from("glossary_terms")
    .select("id, canonical")
    .eq("user_id", user_id)
    .eq("canonical_key", canonicalKey)
    .maybeSingle();

  if (existingRes.error) {
    throw new Error(existingRes.error.message);
  }

  if (existingRes.data?.id) {
    termId = existingRes.data.id;
    termLabel = existingRes.data.canonical ?? termLabel;
  } else {
    const insertRes = await params.supabase
      .from("glossary_terms")
      .insert({ user_id, canonical: label, canonical_key: canonicalKey, category: kind })
      .select("id, canonical")
      .maybeSingle();

    if (insertRes.error) {
      const retry = await params.supabase
        .from("glossary_terms")
        .select("id, canonical")
        .eq("user_id", user_id)
        .eq("canonical_key", canonicalKey)
        .maybeSingle();

      if (retry.error || !retry.data?.id) {
        throw new Error(insertRes.error.message);
      }

      termId = retry.data.id;
      termLabel = retry.data.canonical ?? termLabel;
    } else if (insertRes.data?.id) {
      termId = insertRes.data.id;
      termLabel = insertRes.data.canonical ?? termLabel;
    }
  }

  if (!termId) {
    throw new Error("term_create_failed");
  }

  if (note) {
    const { error: noteErr } = await params.supabase
      .from("glossary_notes")
      .upsert({ term_id: termId, content: note, user_id }, { onConflict: "user_id,term_id" });
    if (noteErr) {
      throw new Error(noteErr.message);
    }
  }

  const linkRes = await params.supabase
    .from("dream_entry_highlights")
    .update({ glossary_term_id: termId })
    .eq("id", highlightId)
    .eq("user_id", user_id)
    .eq("session_id", session_id)
    .select("id")
    .maybeSingle();

  if (linkRes.error) {
    throw new Error(linkRes.error.message);
  }
  if (!linkRes.data?.id) {
    throw new Error("highlight_not_found");
  }

  const count = countOccurrencesInText(params.rawText ?? null, label);
  await upsertGlossaryOccurrences(params.supabase, {
    user_id,
    session_id,
    rows: [{ term_id: termId, source: "user_note", count }],
  });

  await params.supabase.from("term_candidates").delete().eq("user_id", user_id).eq("term", canonicalKey);

  return { termId, canonicalKey, termLabel };
}
