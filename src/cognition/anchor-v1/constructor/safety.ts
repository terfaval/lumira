const INTERPRETIVE_PATTERNS = [
  /\bthis means\b/i,
  /\bthis proves\b/i,
  /\breveals that\b/i,
  /\bshows that\b/i,
  /\bsymbolizes?\b/i,
  /\bmeaning\b/i,
  /\bpsychological\b/i,
];

const DIAGNOSIS_PATTERNS = [
  /\bdiagnos(?:is|e|ed)\b/i,
  /\bdepression\b/i,
  /\banxiety\b/i,
  /\bptsd\b/i,
  /\badhd\b/i,
  /\bbipolar\b/i,
];

const IDENTITY_OR_ADVICE_PATTERNS = [
  /\byou are\b/i,
  /\byou need to\b/i,
  /\byou should\b/i,
  /\bthe user is\b/i,
  /\bsubconscious\b/i,
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

export interface AnchorSafetyScanResult {
  containsInterpretiveLanguage: boolean;
  containsDiagnosisLanguage: boolean;
  containsIdentityOrAdviceLanguage: boolean;
}

export function scanAnchorSafetyLanguage(value: unknown): AnchorSafetyScanResult {
  const strings = collectStrings(value);

  return {
    containsInterpretiveLanguage: matchesAnyPattern(strings, INTERPRETIVE_PATTERNS),
    containsDiagnosisLanguage: matchesAnyPattern(strings, DIAGNOSIS_PATTERNS),
    containsIdentityOrAdviceLanguage: matchesAnyPattern(strings, IDENTITY_OR_ADVICE_PATTERNS),
  };
}
