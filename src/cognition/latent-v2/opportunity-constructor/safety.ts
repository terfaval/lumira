const INTERPRETIVE_PATTERNS = [
  /\bthis means\b/i,
  /\bthis proves\b/i,
  /\breveals that\b/i,
  /\bshows that\b/i,
  /\bsymbolizes?\b/i,
  /\brepresents?\b/i,
];

const IDENTITY_OR_ADVICE_PATTERNS = [
  /\byou are\b/i,
  /\byou need to\b/i,
  /\byou should\b/i,
  /\byour subconscious\b/i,
];

const DIAGNOSIS_PATTERNS = [
  /\bdiagnos(?:is|e|ed)\b/i,
  /\banxiety disorder\b/i,
  /\bdepression\b/i,
  /\bptsd\b/i,
  /\badhd\b/i,
  /\bbipolar\b/i,
  /\btrauma response\b/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStrings(entry));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((entry) => collectStrings(entry));
  }

  return [];
}

function matchesAnyPattern(strings: string[], patterns: RegExp[]): boolean {
  return strings.some((value) => patterns.some((pattern) => pattern.test(value)));
}

export interface OpportunitySafetyScanResult {
  containsInterpretiveLanguage: boolean;
  containsIdentityOrAdviceLanguage: boolean;
  containsDiagnosisLanguage: boolean;
}

export function scanOpportunitySafetyLanguage(value: unknown): OpportunitySafetyScanResult {
  const strings = collectStrings(value);

  return {
    containsInterpretiveLanguage: matchesAnyPattern(strings, INTERPRETIVE_PATTERNS),
    containsIdentityOrAdviceLanguage: matchesAnyPattern(strings, IDENTITY_OR_ADVICE_PATTERNS),
    containsDiagnosisLanguage: matchesAnyPattern(strings, DIAGNOSIS_PATTERNS),
  };
}
