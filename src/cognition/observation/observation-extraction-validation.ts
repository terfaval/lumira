import type { CreateObservationFragmentInput, ObservationCategory } from "@/src/domain/observation/types";
import { OBSERVATION_CATEGORIES } from "@/src/domain/observation/types";

export interface StructuredObservationFragmentInput {
  category: ObservationCategory;
  fragmentText: string;
  position: number;
  uncertaintyNote?: string | null;
  salience?: unknown;
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

export interface EvidenceValidationFailureDiagnostics {
  category: ObservationCategory;
  fragmentText: string;
  receivedSnippet: string;
  exactMatch: boolean;
  sourceExcerpt: string;
}

export interface StructuredObservationEvidenceFailure {
  category: ObservationCategory;
  fragmentText: string;
  position: number;
  uncertaintyNote: string | null;
  evidence: {
    snippet: string;
    contextLabel: string | null;
  };
  diagnostics: EvidenceValidationFailureDiagnostics;
}

export interface ValidatedStructuredObservationFragment extends CreateObservationFragmentInput {
  salience?: unknown;
}

const OBSERVATION_CATEGORY_ALIASES: Record<string, ObservationCategory> = {
  affect_state: "emotion",
  affect_states: "emotion",
  bodily_state: "body_state",
  bodily_states: "body_state",
  continuity_candidate: "continuity_fragment",
  continuity_candidates: "continuity_fragment",
  dream_state_phenomenology: "dream_state_quality",
  spatial_phenomenology: "spatial_instability",
};

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

function normalizeCategoryValue(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeObservationCategory(rawCategory: string): ObservationCategory | null {
  const normalizedCategory = normalizeCategoryValue(rawCategory);
  const aliasedCategory = OBSERVATION_CATEGORY_ALIASES[normalizedCategory] ?? normalizedCategory;

  if (OBSERVATION_CATEGORIES.includes(aliasedCategory as ObservationCategory)) {
    return aliasedCategory as ObservationCategory;
  }

  return null;
}

function buildInvalidCategoryReason(receivedCategory: string): string {
  return `invalid_category:received=${receivedCategory}:allowed=${OBSERVATION_CATEGORIES.join(",")}`;
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

function buildSourceExcerpt(sourceText: string, snippet: string): string {
  const sentences = sourceText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return sourceText.trim();
  }

  const snippetTokens = Array.from(
    new Set(
      normalizeForMatch(snippet)
        .split(" ")
        .map((value) => value.trim())
        .filter((value) => value.length >= 3),
    ),
  );

  let bestSentence = sentences[0];
  let bestScore = -1;

  for (const sentence of sentences) {
    const normalizedSentence = normalizeForMatch(sentence);
    const score = snippetTokens.reduce((total, token) => total + (normalizedSentence.includes(token) ? 1 : 0), 0);

    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  return bestSentence;
}

export function validateEvidenceSnippetAgainstSource(snippet: string, sourceText: string): boolean {
  return normalizeForMatch(sourceText).includes(normalizeForMatch(snippet));
}

export function analyzeStructuredObservationExtraction(input: {
  dreamText: string;
  structured: unknown;
}):
  | {
      ok: true;
      value: {
        summary: string;
        uncertaintyNotes: string[];
        validFragments: ValidatedStructuredObservationFragment[];
        failingFragments: StructuredObservationEvidenceFailure[];
      };
    }
  | { ok: false; reason: string; diagnostics?: EvidenceValidationFailureDiagnostics } {
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

  const validFragments: ValidatedStructuredObservationFragment[] = [];
  const failingFragments: StructuredObservationEvidenceFailure[] = [];

  for (const rawFragment of input.structured.fragments) {
    if (!isRecord(rawFragment)) {
      return { ok: false, reason: "invalid_fragment_shape" };
    }

    const category = rawFragment.category;
    if (typeof category !== "string") {
      return { ok: false, reason: buildInvalidCategoryReason(String(category)) };
    }

    const normalizedCategory = normalizeObservationCategory(category);
    if (!normalizedCategory) {
      return { ok: false, reason: buildInvalidCategoryReason(category) };
    }

    const fragmentText = typeof rawFragment.fragmentText === "string" ? rawFragment.fragmentText.trim() : "";
    const position = typeof rawFragment.position === "number" ? Math.floor(rawFragment.position) : null;
    const evidence = isRecord(rawFragment.evidence) ? rawFragment.evidence : null;
    const snippet = evidence && typeof evidence.snippet === "string" ? evidence.snippet.trim() : "";

    if (!fragmentText || position === null || position < 0 || !snippet) {
      return { ok: false, reason: "invalid_fragment_content" };
    }

    if (!validateEvidenceSnippetAgainstSource(snippet, input.dreamText)) {
      failingFragments.push({
        category: normalizedCategory,
        fragmentText,
        position,
        uncertaintyNote: typeof rawFragment.uncertaintyNote === "string" ? rawFragment.uncertaintyNote.trim() : null,
        evidence: {
          snippet,
          contextLabel: evidence && typeof evidence.contextLabel === "string" ? evidence.contextLabel.trim() : null,
        },
        diagnostics: {
          category: normalizedCategory,
          fragmentText,
          receivedSnippet: snippet,
          exactMatch: input.dreamText.includes(snippet),
          sourceExcerpt: buildSourceExcerpt(input.dreamText, snippet),
        },
      });

      continue;
    }

    const spans = findEvidenceSpan(input.dreamText, snippet);

    validFragments.push({
      category: normalizedCategory,
      fragmentText,
      position,
      uncertaintyNote: typeof rawFragment.uncertaintyNote === "string" ? rawFragment.uncertaintyNote.trim() : null,
      salience: rawFragment.salience,
      evidence: {
        snippet,
        spanStart: spans.spanStart,
        spanEnd: spans.spanEnd,
        contextLabel: evidence && typeof evidence.contextLabel === "string" ? evidence.contextLabel.trim() : "llm_evidence",
      },
    });
  }

  validFragments.sort((a, b) => a.position - b.position);
  failingFragments.sort((a, b) => a.position - b.position);

  return {
    ok: true,
    value: {
      summary,
      uncertaintyNotes,
      validFragments,
      failingFragments,
    },
  };
}

export function normalizeStructuredObservationExtraction(input: {
  dreamText: string;
  structured: unknown;
}):
  | { ok: true; value: { summary: string; uncertaintyNotes: string[]; fragments: ValidatedStructuredObservationFragment[] } }
  | { ok: false; reason: string; diagnostics?: EvidenceValidationFailureDiagnostics } {
  const analysis = analyzeStructuredObservationExtraction(input);
  if (!analysis.ok) {
    return analysis;
  }

  if (analysis.value.failingFragments.length > 0) {
    return {
      ok: false,
      reason: "evidence_validation_failed",
      diagnostics: analysis.value.failingFragments[0]?.diagnostics,
    };
  }

  return {
    ok: true,
    value: {
      summary: analysis.value.summary,
      uncertaintyNotes: analysis.value.uncertaintyNotes,
      fragments: analysis.value.validFragments,
    },
  };
}
