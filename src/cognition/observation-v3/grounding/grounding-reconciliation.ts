import type { ObservationV2EvidenceRef } from "@/src/domain/observation/v2-runtime";

export interface GroundingScope {
  start: number;
  end: number;
}

export type GroundingOutcome =
  | {
      status: "grounded_certain";
      evidence: ObservationV2EvidenceRef;
      method:
        | "exact_absolute_coordinates"
        | "exact_scope_relative_coordinates"
        | "unique_exact_snippet"
        | "unique_normalized_snippet";
    }
  | {
      status: "grounded_uncertain";
      evidence: ObservationV2EvidenceRef;
      method: "deterministic_attribution_with_boundary_uncertainty";
    }
  | {
      status: "geometry_failed_but_locally_attributable";
      boundedAttribution: GroundingScope;
      reason:
        | "multiple_candidates_within_allowed_scope"
        | "contradictory_coordinate_proposals";
    }
  | {
      status: "unsupported";
      reason:
        | "empty_snippet"
        | "no_deterministic_textual_support"
        | "multiple_candidates_without_bounded_scope";
    };

function clampScope(scope: GroundingScope, sourceLength: number): GroundingScope | null {
  const start = Math.max(0, Math.min(sourceLength, scope.start));
  const end = Math.max(0, Math.min(sourceLength, scope.end));
  return end > start ? { start, end } : null;
}

function intersectScope(left: GroundingScope, right: GroundingScope): GroundingScope | null {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  return end > start ? { start, end } : null;
}

function hasExactSnippetAt(input: {
  sourceText: string;
  snippet: string;
  spanStart: number;
  spanEnd: number;
}): boolean {
  if (input.spanStart < 0 || input.spanEnd <= input.spanStart || input.spanEnd > input.sourceText.length) {
    return false;
  }

  return input.sourceText.slice(input.spanStart, input.spanEnd) === input.snippet;
}

function findAllSnippetOffsetsInScope(input: {
  sourceText: string;
  snippet: string;
  scope: GroundingScope;
}): number[] {
  const matches: number[] = [];
  let fromIndex = input.scope.start;

  while (fromIndex < input.scope.end) {
    const foundAt = input.sourceText.indexOf(input.snippet, fromIndex);
    if (foundAt === -1) {
      break;
    }
    if (foundAt + input.snippet.length > input.scope.end) {
      break;
    }
    matches.push(foundAt);
    fromIndex = foundAt + 1;
  }

  return matches;
}

function isLexicalCharacter(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function normalizeForGrounding(value: string): { normalized: string; indexMap: number[] } {
  const normalizedChars: string[] = [];
  const indexMap: number[] = [];
  let previousWasSeparator = true;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    if (isLexicalCharacter(char)) {
      normalizedChars.push(char.toLocaleLowerCase());
      indexMap.push(index);
      previousWasSeparator = false;
      continue;
    }

    if (!previousWasSeparator && normalizedChars.length > 0) {
      normalizedChars.push(" ");
      indexMap.push(index);
      previousWasSeparator = true;
    }
  }

  while (normalizedChars[0] === " ") {
    normalizedChars.shift();
    indexMap.shift();
  }
  while (normalizedChars.at(-1) === " ") {
    normalizedChars.pop();
    indexMap.pop();
  }

  return {
    normalized: normalizedChars.join(""),
    indexMap,
  };
}

function expandTrailingNonLexical(input: {
  sourceText: string;
  spanEnd: number;
  scopeEnd: number;
}): number {
  let spanEnd = input.spanEnd;
  while (spanEnd < input.scopeEnd) {
    const char = input.sourceText[spanEnd]!;
    if (isLexicalCharacter(char)) {
      break;
    }
    spanEnd += 1;
  }
  return spanEnd;
}

function findNormalizedMatchesInScope(input: {
  sourceText: string;
  snippet: string;
  scope: GroundingScope;
}): Array<{ start: number; end: number }> {
  const sourceSlice = input.sourceText.slice(input.scope.start, input.scope.end);
  const normalizedSource = normalizeForGrounding(sourceSlice);
  const normalizedSnippet = normalizeForGrounding(input.snippet).normalized;

  if (!normalizedSnippet) {
    return [];
  }

  const matches: Array<{ start: number; end: number }> = [];
  let fromIndex = 0;
  while (fromIndex < normalizedSource.normalized.length) {
    const foundAt = normalizedSource.normalized.indexOf(normalizedSnippet, fromIndex);
    if (foundAt === -1) {
      break;
    }

    const endIndex = foundAt + normalizedSnippet.length - 1;
    const localStart = normalizedSource.indexMap[foundAt];
    const localEnd = normalizedSource.indexMap[endIndex];
    if (typeof localStart === "number" && typeof localEnd === "number") {
      const absoluteStart = input.scope.start + localStart;
      const absoluteEnd = expandTrailingNonLexical({
        sourceText: input.sourceText,
        spanEnd: input.scope.start + localEnd + 1,
        scopeEnd: input.scope.end,
      });
      matches.push({ start: absoluteStart, end: absoluteEnd });
    }

    fromIndex = foundAt + 1;
  }

  return matches;
}

function buildSearchScope(input: {
  sourceLength: number;
  allowedScope?: GroundingScope;
  afterAnchor?: number | null;
  beforeAnchor?: number | null;
}): GroundingScope | null {
  let scope: GroundingScope | null = {
    start: 0,
    end: input.sourceLength,
  };

  if (input.allowedScope) {
    scope = intersectScope(scope, input.allowedScope);
  }
  if (typeof input.afterAnchor === "number") {
    scope = scope ? intersectScope(scope, { start: input.afterAnchor, end: input.sourceLength }) : null;
  }
  if (typeof input.beforeAnchor === "number") {
    scope = scope ? intersectScope(scope, { start: 0, end: input.beforeAnchor }) : null;
  }

  return scope ? clampScope(scope, input.sourceLength) : null;
}

function hasBoundedScope(scope: GroundingScope, sourceTextLength: number): boolean {
  return scope.start > 0 || scope.end < sourceTextLength;
}

export function reconcileEvidenceToSource(input: {
  sourceText: string;
  evidence: ObservationV2EvidenceRef;
  allowedScope?: GroundingScope;
  afterAnchor?: number | null;
  beforeAnchor?: number | null;
  fallbackToSourceScope?: boolean;
  requireAbsoluteCoordinatesWithinScope?: boolean;
}): GroundingOutcome {
  const snippet = input.evidence.snippet.trim();
  if (!snippet) {
    return {
      status: "unsupported",
      reason: "empty_snippet",
    };
  }

  const sourceLength = input.sourceText.length;
  const allowSourceFallback = input.fallbackToSourceScope ?? true;
  const searchScope = buildSearchScope({
    sourceLength,
    allowedScope: input.allowedScope,
    afterAnchor: input.afterAnchor,
    beforeAnchor: input.beforeAnchor,
  });

  const absoluteCoordinatesAreUsable = (
    typeof input.evidence.spanStart === "number"
    && typeof input.evidence.spanEnd === "number"
    && (
      !input.requireAbsoluteCoordinatesWithinScope
      || !searchScope
      || (
        input.evidence.spanStart >= searchScope.start
        && input.evidence.spanEnd <= searchScope.end
      )
    )
  );
  const absoluteSpanStart = typeof input.evidence.spanStart === "number" ? input.evidence.spanStart : null;
  const absoluteSpanEnd = typeof input.evidence.spanEnd === "number" ? input.evidence.spanEnd : null;

  if (
    absoluteCoordinatesAreUsable
    && absoluteSpanStart !== null
    && absoluteSpanEnd !== null
    && hasExactSnippetAt({
      sourceText: input.sourceText,
      snippet,
      spanStart: absoluteSpanStart,
      spanEnd: absoluteSpanEnd,
    })
  ) {
    return {
      status: "grounded_certain",
      method: "exact_absolute_coordinates",
      evidence: {
        ...input.evidence,
        snippet,
        spanStart: absoluteSpanStart,
        spanEnd: absoluteSpanEnd,
      },
    };
  }

  const sourceScope = buildSearchScope({
    sourceLength,
    afterAnchor: input.afterAnchor,
    beforeAnchor: input.beforeAnchor,
  });

  if (
    searchScope
    && typeof input.evidence.spanStart === "number"
    && typeof input.evidence.spanEnd === "number"
  ) {
    const relativeStart = searchScope.start + input.evidence.spanStart;
    const relativeEnd = searchScope.start + input.evidence.spanEnd;
    if (
      relativeStart >= searchScope.start
      && relativeEnd <= searchScope.end
      && hasExactSnippetAt({
        sourceText: input.sourceText,
        snippet,
        spanStart: relativeStart,
        spanEnd: relativeEnd,
      })
    ) {
      return {
        status: "grounded_certain",
        method: "exact_scope_relative_coordinates",
        evidence: {
          ...input.evidence,
          snippet,
          spanStart: relativeStart,
          spanEnd: relativeEnd,
        },
      };
    }
  }

  const exactMatchesInPreferredScope = searchScope
    ? findAllSnippetOffsetsInScope({
        sourceText: input.sourceText,
        snippet,
        scope: searchScope,
      })
    : [];
  if (exactMatchesInPreferredScope.length === 1) {
    const spanStart = exactMatchesInPreferredScope[0]!;
    return {
      status: "grounded_certain",
      method: "unique_exact_snippet",
      evidence: {
        ...input.evidence,
        snippet,
        spanStart,
        spanEnd: spanStart + snippet.length,
      },
    };
  }

  const normalizedMatchesInPreferredScope = searchScope
    ? findNormalizedMatchesInScope({
        sourceText: input.sourceText,
        snippet,
        scope: searchScope,
      })
    : [];
  if (normalizedMatchesInPreferredScope.length === 1) {
    const match = normalizedMatchesInPreferredScope[0]!;
    return {
      status: "grounded_certain",
      method: "unique_normalized_snippet",
      evidence: {
        ...input.evidence,
        snippet: input.sourceText.slice(match.start, match.end),
        spanStart: match.start,
        spanEnd: match.end,
      },
    };
  }

  if (
    searchScope
    && hasBoundedScope(searchScope, input.sourceText.length)
    && (exactMatchesInPreferredScope.length > 1 || normalizedMatchesInPreferredScope.length > 1)
  ) {
    return {
      status: "geometry_failed_but_locally_attributable",
      boundedAttribution: searchScope,
      reason: "multiple_candidates_within_allowed_scope",
    };
  }

  if (allowSourceFallback && sourceScope && (!searchScope || sourceScope.start !== searchScope.start || sourceScope.end !== searchScope.end)) {
    const exactMatchesInSourceScope = findAllSnippetOffsetsInScope({
      sourceText: input.sourceText,
      snippet,
      scope: sourceScope,
    });
    if (exactMatchesInSourceScope.length === 1) {
      const spanStart = exactMatchesInSourceScope[0]!;
      return {
        status: "grounded_certain",
        method: "unique_exact_snippet",
        evidence: {
          ...input.evidence,
          snippet,
          spanStart,
          spanEnd: spanStart + snippet.length,
        },
      };
    }

    const normalizedMatchesInSourceScope = findNormalizedMatchesInScope({
      sourceText: input.sourceText,
      snippet,
      scope: sourceScope,
    });
    if (normalizedMatchesInSourceScope.length === 1) {
      const match = normalizedMatchesInSourceScope[0]!;
      return {
        status: "grounded_certain",
        method: "unique_normalized_snippet",
        evidence: {
          ...input.evidence,
          snippet: input.sourceText.slice(match.start, match.end),
          spanStart: match.start,
          spanEnd: match.end,
        },
      };
    }
  }

  return {
    status: "unsupported",
    reason: exactMatchesInPreferredScope.length > 1 || normalizedMatchesInPreferredScope.length > 1
      ? "multiple_candidates_without_bounded_scope"
      : "no_deterministic_textual_support",
  };
}
