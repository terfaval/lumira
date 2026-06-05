import type { CreateObservationFragmentInput, ObservationCategory } from "@/src/domain/observation/types";
import { OBSERVATION_CATEGORIES } from "@/src/domain/observation/types";

export interface StructuredObservationFragmentInput {
  category: ObservationCategory;
  fragmentText: string;
  position: number;
  uncertaintyNote?: string | null;
  evidence: {
    snippet: string;
    spanStart?: number | null;
    spanEnd?: number | null;
    contextLabel?: string | null;
  };
}

export interface StructuredObservationExtractionInput {
  summary: string;
  uncertaintyNotes?: string[];
  fragments: StructuredObservationFragmentInput[];
}

function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findEvidenceSpan(sourceText: string, snippet: string): { spanStart: number | null; spanEnd: number | null } {
  const directIndex = sourceText.indexOf(snippet);
  if (directIndex >= 0) {
    return {
      spanStart: directIndex,
      spanEnd: directIndex + snippet.length,
    };
  }

  const sourceLower = sourceText.toLocaleLowerCase();
  const snippetLower = snippet.toLocaleLowerCase();
  const lowerIndex = sourceLower.indexOf(snippetLower);
  if (lowerIndex >= 0) {
    return {
      spanStart: lowerIndex,
      spanEnd: lowerIndex + snippet.length,
    };
  }

  return {
    spanStart: null,
    spanEnd: null,
  };
}

export function validateEvidenceSnippetAgainstSource(snippet: string, sourceText: string): boolean {
  return normalizeForMatch(sourceText).includes(normalizeForMatch(snippet));
}

export function normalizeStructuredObservationExtraction(input: {
  dreamText: string;
  structured: unknown;
}): { ok: true; value: { summary: string; uncertaintyNotes: string[]; fragments: CreateObservationFragmentInput[] } } | { ok: false; reason: string } {
  if (!isRecord(input.structured)) {
    return { ok: false, reason: "invalid_structured_payload" };
  }

  const summary = typeof input.structured.summary === "string" ? input.structured.summary.trim() : "";
  if (!summary) {
    return { ok: false, reason: "missing_summary" };
  }

  if (!Array.isArray(input.structured.fragments) || input.structured.fragments.length === 0) {
    return { ok: false, reason: "missing_fragments" };
  }

  const uncertaintyNotes = Array.isArray(input.structured.uncertaintyNotes)
    ? input.structured.uncertaintyNotes.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];

  const fragments: CreateObservationFragmentInput[] = [];

  for (const rawFragment of input.structured.fragments) {
    if (!isRecord(rawFragment)) {
      return { ok: false, reason: "invalid_fragment_shape" };
    }

    const category = rawFragment.category;
    if (typeof category !== "string" || !OBSERVATION_CATEGORIES.includes(category as ObservationCategory)) {
      return { ok: false, reason: "invalid_category" };
    }

    const fragmentText = typeof rawFragment.fragmentText === "string" ? rawFragment.fragmentText.trim() : "";
    const position = typeof rawFragment.position === "number" ? Math.floor(rawFragment.position) : null;
    const evidence = isRecord(rawFragment.evidence) ? rawFragment.evidence : null;
    const snippet = evidence && typeof evidence.snippet === "string" ? evidence.snippet.trim() : "";

    if (!fragmentText || position === null || position < 0 || !snippet) {
      return { ok: false, reason: "invalid_fragment_content" };
    }

    if (!validateEvidenceSnippetAgainstSource(snippet, input.dreamText)) {
      return { ok: false, reason: "evidence_validation_failed" };
    }

    const spans = findEvidenceSpan(input.dreamText, snippet);

    fragments.push({
      category: category as ObservationCategory,
      fragmentText,
      position,
      uncertaintyNote: typeof rawFragment.uncertaintyNote === "string" ? rawFragment.uncertaintyNote.trim() : null,
      evidence: {
        snippet,
        spanStart: spans.spanStart,
        spanEnd: spans.spanEnd,
        contextLabel: evidence && typeof evidence.contextLabel === "string" ? evidence.contextLabel.trim() : "llm_evidence",
      },
    });
  }

  fragments.sort((a, b) => a.position - b.position);

  return {
    ok: true,
    value: {
      summary,
      uncertaintyNotes,
      fragments,
    },
  };
}
