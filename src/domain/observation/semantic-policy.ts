import type {
  CreateObservationFragmentInput,
  ObservationEvidenceAdequacy,
  ObservationProvenanceTier,
  ObservationSemanticPolicyResult,
  ObservationSource,
  ObservationSummaryTrace,
} from "@/src/domain/observation/types";

const BOUNDARY_VERSION = "observation_semantic_guardrails_v1";

const INTERPRETIVE_MARKERS = [
  "means",
  "symbolizes",
  "represents",
  "proves",
  "reveals",
  "diagnosis",
  "disorder",
  "trauma",
  "suppressed",
  "subconscious",
  "attachment insecurity",
  "fear of abandonment",
  "identity fragmentation",
  "paternal fear",
  "abandonment trauma",
  "attachment pathology",
  "emotional disorder",
  "unresolved childhood conflict",
  "suppresses anger",
  "subconscious expresses insecurity",
];
const METAPHYSICAL_AUTHORITY_MARKERS = [
  "another dimension",
  "higher reality",
  "ultimate truth",
  "prophetic certainty",
  "cosmic revelation",
  "spiritual awakening",
  "dream revealed reality",
  "dream revealed ultimate truth",
  "dream reveals ultimate truth",
  "dream accessed higher reality",
];

const HIDDEN_CAUSE_PATTERNS = [
  /\b(because|due to|caused by)\b.{0,80}\b(father|mother|childhood|trauma|attachment|identity)\b/i,
  /\bthis confirms\b/i,
];
const METAPHYSICAL_AUTHORITY_PATTERNS = [
  /\bdream\b.{0,24}\b(accessed|revealed|reveals|proved|proves)\b.{0,32}\b(higher reality|ultimate truth|another dimension)\b/i,
  /\b(spiritual|cosmic)\b.{0,24}\b(revelation|certainty|truth)\b/i,
];

const CERTAINTY_MARKERS = ["definitely", "certainly", "undeniably", "always", "proves"];
const RECURRENCE_CUES = ["again", "repeated", "recurring", "similar", "previously", "before", "same pattern"];
const AGENCY_CUES = [
  "refuse",
  "refused",
  "refuses",
  "refusal",
  "resist",
  "resisted",
  "resists",
  "resistance",
  "coerc",
  "forced to",
  "made to",
  "dragged",
  "pulled forward",
  "tried to escape",
  "trying to escape",
  "attempted escape",
  "attempts escape",
  "escape",
  "pursuit",
  "chased",
  "had to run",
  "unable to reach",
  "could not reach",
  "couldn't reach",
  "too slow",
  "slowed movement",
  "unable to move",
  "unable to speak",
  "could not move",
  "couldn't move",
  "could not speak",
  "couldn't speak",
  "could not speak",
  "paralyzed",
  "paralysed",
  "stuck",
  "frozen",
  "blocked",
  "impossible",
  "speech became impossible",
  "chose to",
  "decided to",
  "intentional",
  "deliberate",
  "being carried",
  "lost control",
  "control returned",
  "involuntary",
  "nem akartam",
  "ellenálltam",
  "el akartam menekülni",
  "futnom kellett",
  "nem tudtam elég gyorsan haladni",
];
const METACOGNITIVE_CUES = [
  "noticed",
  "realized",
  "realised",
  "aware",
  "awareness",
  "suspected",
  "dreaming",
  "lucid",
  "questioned reality",
  "questioned whether",
  "tested",
  "strange",
  "inconsisten",
  "repetition",
];
const METACOGNITIVE_FORBIDDEN_MARKERS = [
  "higher consciousness",
  "spiritual awakening",
  "unconscious became integrated",
  "consciousness hierarchy",
];
const AFFECT_FORBIDDEN_MARKERS = [
  "repressed trauma",
  "subconscious diagnosis",
  "hidden emotional cause",
  "attachment wound",
  "emotional pathology",
];
const AFFECT_TRANSITION_CUES = [
  "at first",
  "then",
  "began",
  "began to",
  "started to",
  "gives way to",
  "gave way to",
  "became",
  "becoming",
  "shifted into",
  "intensified",
  "softened",
  "dissolved",
  "collapsed back",
  "grew into",
  "turned into",
  "gradually",
  "suddenly",
  "először",
  "aztán",
  "majd",
  "kezdtem",
];
const EMOTIONAL_CONTRADICTION_CUES = [
  "simultaneously",
  "at once",
  "mixed with",
  "conflicting",
  "ambivalent",
  "contradictory",
  "unclear emotional",
  "emotionally unresolved",
  "fear and curiosity",
  "comfort and unease",
];
const AFFECTIVE_ATMOSPHERE_CUES = [
  "atmosphere",
  "air felt",
  "diffuse tension",
  "oppressive",
  "charged silence",
  "emotional heaviness",
  "environment carried",
  "scene felt tense",
  "ambient unease",
];
const SPATIAL_INSTABILITY_CUES = [
  "impossible geometry",
  "geometry changed",
  "geometry kept changing",
  "room kept changing",
  "hallway looped",
  "looping corridor",
  "looping space",
  "space looped",
  "architecture shifted",
  "walls moved",
  "door led back",
  "labyrinth",
];
const DREAM_STATE_QUALITY_CUES = [
  "still dreaming",
  "false awakening",
  "dream felt unstable",
  "dream felt fragile",
  "dream-state instability",
  "lucid",
  "dreamlike",
  "woke up but",
];
const CONTINUITY_FRAGMENT_CUES = [
  "abruptly shifted",
  "abrupt shift",
  "without a transition",
  "without a bridge",
  "without any bridge",
  "jumped to a different place",
  "different place without a transition",
  "different place without a bridge",
  "without transition",
  "scene jumped",
  "abruptly elsewhere",
  "no transition",
  "missing time",
  "memory gap",
  "suddenly elsewhere",
  "still dreaming",
  "false awakening",
  "woke up in",
  "átmenet nélkül",
  "hirtelen",
];
const ALTERED_REALISM_CUES = [
  "mirror anomaly",
  "missing reflection",
  "no reflection",
  "reflection was missing",
  "did not show the dreamer's reflection",
  "does not show the dreamer's reflection",
  "mirror showed an impossible image",
  "distorted reflection",
  "strange reflection",
  "reality behaved strangely",
  "reality was behaving strangely",
  "felt unreal",
  "seemed unreal",
  "not real",
  "hyperreal",
  "reality felt thin",
  "distorted reality",
  "altered realism",
  "tükör",
  "tükörkép",
  "tükröződés",
  "nem látszódtam a tükörben",
];
const AFFECT_TONE_MARKERS = [
  "fear",
  "unease",
  "panic",
  "calm",
  "relief",
  "curiosity",
  "tension",
  "urgency",
  "dread",
  "warmth",
  "heaviness",
  "kíváncsi",
  "félelem",
  "félni",
  "szorong",
  "megkönnyebbül",
];

const LATENT_BACKFLOW_MARKERS = [
  "possible_recurrence",
  "possible_resurfacing",
  "possible_connection",
  "phase6_latent_scaffold",
  "phase7_opening_scaffold",
  "reflective_space_optional",
  "dormant continuity may be nearby",
];

const FUTURE_ONTOLOGY_DIMENSION_HINTS = [
  "agency_state",
  "metacognitive_moment",
  "affect_transition",
  "emotional_contradiction",
  "affective_atmosphere",
  "spatial_instability",
  "dream_state_quality",
  "continuity_fragment",
  "altered_realism",
  "phenomenological_relation",
] as const;

type SemanticDecision = {
  result: ObservationSemanticPolicyResult;
  reasons: string[];
  uncertaintyNotes: string[];
  summaryTrace: ObservationSummaryTrace[];
  fragments: CreateObservationFragmentInput[];
  provenanceTier: ObservationProvenanceTier;
  latentBackflowGuard: "observation_only";
  boundaryVersion: string;
  ontologyPreparationHints: readonly string[];
};

function normalize(text: string): string {
  return text.toLowerCase();
}

function containsAny(text: string, markers: readonly string[]): boolean {
  const lower = normalize(text);
  return markers.some((marker) => lower.includes(marker));
}

function containsPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function mapSourceToProvenanceTier(source: ObservationSource): ObservationProvenanceTier {
  if (source === "system_descriptive_extract" || source === "system_llm_extract") {
    return "system_extract";
  }
  return "manual_user";
}

function classifyEvidenceAdequacy(fragment: CreateObservationFragmentInput): ObservationEvidenceAdequacy {
  const { snippet, spanStart, spanEnd } = fragment.evidence;
  if (spanStart !== null && spanEnd !== null && spanEnd >= spanStart) {
    return "strong_span";
  }

  if (snippet.trim().length >= 24) {
    return "snippet_only";
  }

  return "weak_fallback";
}

function isRecurrenceDescriptive(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return RECURRENCE_CUES.some((cue) => lower.includes(cue));
}

function buildCueText(fragment: CreateObservationFragmentInput): string {
  return normalize(`${fragment.fragmentText} ${fragment.evidence.snippet}`);
}

function hasAgencyCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return AGENCY_CUES.some((cue) => lower.includes(cue));
}

function hasMetacognitiveCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return METACOGNITIVE_CUES.some((cue) => lower.includes(cue));
}

function hasAffectTone(text: string): boolean {
  const lower = normalize(text);
  return AFFECT_TONE_MARKERS.some((cue) => lower.includes(cue));
}

function hasAffectTransitionCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return hasAffectTone(lower) && AFFECT_TRANSITION_CUES.some((cue) => lower.includes(cue));
}

function hasEmotionalContradictionCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  const hasContradictionMarker = EMOTIONAL_CONTRADICTION_CUES.some((cue) => lower.includes(cue));
  if (hasContradictionMarker) {
    return true;
  }
  return hasAffectTone(lower) && /\bboth\b.{0,32}\band\b/.test(lower);
}

function hasAffectiveAtmosphereCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return AFFECTIVE_ATMOSPHERE_CUES.some((cue) => lower.includes(cue));
}

function hasSpatialInstabilityCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return SPATIAL_INSTABILITY_CUES.some((cue) => lower.includes(cue));
}

function hasDreamStateQualityCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return DREAM_STATE_QUALITY_CUES.some((cue) => lower.includes(cue));
}

function hasContinuityFragmentCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return CONTINUITY_FRAGMENT_CUES.some((cue) => lower.includes(cue));
}

function hasAlteredRealismCue(fragment: CreateObservationFragmentInput): boolean {
  const lower = buildCueText(fragment);
  return ALTERED_REALISM_CUES.some((cue) => lower.includes(cue));
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

function buildSummaryTrace(summary: string, fragments: CreateObservationFragmentInput[]): ObservationSummaryTrace[] {
  const summaryTokens = tokenize(summary);
  if (summaryTokens.length === 0) {
    return [];
  }

  const traces: ObservationSummaryTrace[] = [];
  for (const fragment of fragments) {
    const fragmentTokens = new Set(tokenize(fragment.fragmentText));
    const overlap = summaryTokens.filter((token) => fragmentTokens.has(token)).length;
    if (overlap === 0) {
      continue;
    }

    traces.push({
      fragmentPosition: fragment.position,
      reason: "inferred_overlap",
      strength: overlap >= 2 ? "strong" : "weak",
    });
  }

  traces.sort((a, b) => a.fragmentPosition - b.fragmentPosition);
  return traces.slice(0, 5);
}

function validateRequestedSummaryTrace(input: {
  summary: string;
  fragments: CreateObservationFragmentInput[];
  requestedSummaryTrace: ObservationSummaryTrace[];
}): {
  ok: boolean;
  reasons: string[];
} {
  const fragmentPositions = new Set(input.fragments.map((fragment) => fragment.position));
  const seenPositions = new Set<number>();
  const reasons = new Set<string>();

  for (const trace of input.requestedSummaryTrace) {
    if (!Number.isInteger(trace.fragmentPosition) || trace.fragmentPosition < 0) {
      reasons.add("summary_trace_invalid");
      continue;
    }

    if (trace.reason !== "explicit_anchor" && trace.reason !== "inferred_overlap") {
      reasons.add("summary_trace_invalid");
      continue;
    }

    if (trace.strength !== "strong" && trace.strength !== "weak") {
      reasons.add("summary_trace_invalid");
      continue;
    }

    if (seenPositions.has(trace.fragmentPosition)) {
      reasons.add("summary_trace_invalid");
      continue;
    }
    seenPositions.add(trace.fragmentPosition);

    const fragment = input.fragments.find((candidate) => candidate.position === trace.fragmentPosition);
    if (!fragment || !fragmentPositions.has(trace.fragmentPosition)) {
      reasons.add("summary_trace_stale");
      continue;
    }

    if (trace.reason === "inferred_overlap") {
      const summaryTokens = new Set(tokenize(input.summary));
      const fragmentTokens = new Set(tokenize(fragment.fragmentText));
      const overlap = Array.from(summaryTokens).filter((token) => fragmentTokens.has(token)).length;
      if (overlap === 0) {
        reasons.add("summary_trace_unsupported");
      }
    }
  }

  return {
    ok: reasons.size === 0,
    reasons: Array.from(reasons),
  };
}

function hasInterpretiveLanguage(summary: string, fragments: CreateObservationFragmentInput[]): boolean {
  if (containsAny(summary, INTERPRETIVE_MARKERS) || containsPattern(summary, HIDDEN_CAUSE_PATTERNS)) {
    return true;
  }

  if (containsAny(summary, METACOGNITIVE_FORBIDDEN_MARKERS)) {
    return true;
  }

  if (containsAny(summary, AFFECT_FORBIDDEN_MARKERS)) {
    return true;
  }

  if (containsAny(summary, METAPHYSICAL_AUTHORITY_MARKERS) || containsPattern(summary, METAPHYSICAL_AUTHORITY_PATTERNS)) {
    return true;
  }

  return fragments.some((fragment) =>
    containsAny(fragment.fragmentText, INTERPRETIVE_MARKERS) ||
    containsPattern(fragment.fragmentText, HIDDEN_CAUSE_PATTERNS) ||
    containsAny(fragment.fragmentText, METACOGNITIVE_FORBIDDEN_MARKERS) ||
    containsAny(fragment.fragmentText, AFFECT_FORBIDDEN_MARKERS) ||
    containsAny(fragment.fragmentText, METAPHYSICAL_AUTHORITY_MARKERS) ||
    containsPattern(fragment.fragmentText, METAPHYSICAL_AUTHORITY_PATTERNS),
  );
}

function hasLatentBackflowLanguage(summary: string, fragments: CreateObservationFragmentInput[]): boolean {
  if (containsAny(summary, LATENT_BACKFLOW_MARKERS)) {
    return true;
  }

  return fragments.some((fragment) => containsAny(fragment.fragmentText, LATENT_BACKFLOW_MARKERS));
}

function hasCertaintyLanguage(summary: string, fragments: CreateObservationFragmentInput[]): boolean {
  if (containsAny(summary, CERTAINTY_MARKERS)) {
    return true;
  }

  return fragments.some((fragment) => containsAny(fragment.fragmentText, CERTAINTY_MARKERS));
}

function hardenRecurrenceSemantics(
  fragments: CreateObservationFragmentInput[],
  reasons: string[],
  uncertaintyNotes: string[],
): { fragments: CreateObservationFragmentInput[]; shouldDefer: boolean } {
  let shouldDefer = false;

  const hardenedFragments = fragments.map((fragment) => {
    const evidenceAdequacy = classifyEvidenceAdequacy(fragment);
    const next: CreateObservationFragmentInput = {
      ...fragment,
      evidenceAdequacy,
    };

    if (fragment.category !== "recurrence_candidate") {
      return next;
    }

    if (!isRecurrenceDescriptive(fragment.fragmentText)) {
      reasons.push("recurrence_candidate_missing_descriptive_recurrence_cue");
      uncertaintyNotes.push("Recurrence fragment kept tentative due to weak explicit recurrence wording.");
      shouldDefer = shouldDefer || evidenceAdequacy === "weak_fallback";
    }

    if (evidenceAdequacy === "weak_fallback") {
      reasons.push("recurrence_candidate_evidence_weak");
      uncertaintyNotes.push("Recurrence fragment evidence is weak; treated as tentative continuity hint.");
      shouldDefer = true;
    }

    return next;
  });

  return { fragments: hardenedFragments, shouldDefer };
}

function hasCategoryCoherenceRisk(fragment: CreateObservationFragmentInput): boolean {
  const { category, fragmentText } = fragment;
  if (category === "emotion") {
    // Guard against symbolic/diagnostic spillover inside emotional descriptions.
    return containsAny(fragmentText, ["therefore", "so it means", "proves"]);
  }

  if (category === "agency_state") {
    return !hasAgencyCue(fragment);
  }

  if (category === "metacognitive_moment") {
    return !hasMetacognitiveCue(fragment);
  }

  if (category === "affect_transition") {
    return !hasAffectTransitionCue(fragment);
  }

  if (category === "emotional_contradiction") {
    return !hasEmotionalContradictionCue(fragment);
  }

  if (category === "affective_atmosphere") {
    return !hasAffectiveAtmosphereCue(fragment);
  }

  if (category === "spatial_instability") {
    return !hasSpatialInstabilityCue(fragment);
  }

  if (category === "dream_state_quality") {
    return !hasDreamStateQualityCue(fragment);
  }

  if (category === "continuity_fragment") {
    return !hasContinuityFragmentCue(fragment);
  }

  if (category === "altered_realism") {
    return !hasAlteredRealismCue(fragment);
  }

  return false;
}

export function evaluateObservationSemanticPolicy(input: {
  source: ObservationSource;
  summary: string;
  fragments: CreateObservationFragmentInput[];
  requestedProvenanceTier?: ObservationProvenanceTier;
  requestedSummaryTrace?: ObservationSummaryTrace[];
}): SemanticDecision {
  const reasons: string[] = [];
  const uncertaintyNotes: string[] = [];

  const normalizedSummary = input.summary.trim();
  const sourceTier = mapSourceToProvenanceTier(input.source);
  const requestedTier = input.requestedProvenanceTier;
  const provenanceTier = requestedTier ?? sourceTier;

  if (requestedTier && requestedTier !== sourceTier && requestedTier !== "reviewed") {
    reasons.push("provenance_tier_source_mismatch");
  }

  if (hasInterpretiveLanguage(normalizedSummary, input.fragments)) {
    return {
      result: "reject_interpretive",
      reasons: ["interpretive_or_authoritative_language_detected", ...reasons],
      uncertaintyNotes,
      summaryTrace: [],
      fragments: input.fragments,
      provenanceTier,
      latentBackflowGuard: "observation_only",
      boundaryVersion: BOUNDARY_VERSION,
      ontologyPreparationHints: FUTURE_ONTOLOGY_DIMENSION_HINTS,
    };
  }

  if (hasLatentBackflowLanguage(normalizedSummary, input.fragments)) {
    return {
      result: "reject_interpretive",
      reasons: ["latent_backflow_phrase_detected", ...reasons],
      uncertaintyNotes,
      summaryTrace: [],
      fragments: input.fragments,
      provenanceTier,
      latentBackflowGuard: "observation_only",
      boundaryVersion: BOUNDARY_VERSION,
      ontologyPreparationHints: FUTURE_ONTOLOGY_DIMENSION_HINTS,
    };
  }

  const recurrence = hardenRecurrenceSemantics(input.fragments, reasons, uncertaintyNotes);

  if (hasCertaintyLanguage(normalizedSummary, recurrence.fragments)) {
    reasons.push("certainty_language_detected");
  }

  for (const fragment of recurrence.fragments) {
    if (hasCategoryCoherenceRisk(fragment)) {
      reasons.push(`category_coherence_risk:${fragment.category}`);
      uncertaintyNotes.push(`Category coherence risk detected for ${fragment.category} fragment.`);
    }
  }

  const weakEvidenceCount = recurrence.fragments.filter((fragment) => fragment.evidenceAdequacy === "weak_fallback").length;
  const generatedTrace = buildSummaryTrace(normalizedSummary, recurrence.fragments);
  let summaryTrace = generatedTrace;

  if (input.requestedSummaryTrace && input.requestedSummaryTrace.length > 0) {
    const requestedTraceValidation = validateRequestedSummaryTrace({
      summary: normalizedSummary,
      fragments: recurrence.fragments,
      requestedSummaryTrace: input.requestedSummaryTrace,
    });

    if (requestedTraceValidation.ok) {
      summaryTrace = input.requestedSummaryTrace;
    } else {
      reasons.push(...requestedTraceValidation.reasons);
    }
  }

  if (summaryTrace.length === 0) {
    reasons.push("summary_trace_missing");
  }

  if (recurrence.shouldDefer || weakEvidenceCount > 0 || reasons.includes("summary_trace_missing")) {
    if (reasons.length === 0) {
      reasons.push("insufficient_evidence_for_stable_summary");
    }
    return {
      result: "defer_insufficient_evidence",
      reasons,
      uncertaintyNotes,
      summaryTrace,
      fragments: recurrence.fragments,
      provenanceTier,
      latentBackflowGuard: "observation_only",
      boundaryVersion: BOUNDARY_VERSION,
      ontologyPreparationHints: FUTURE_ONTOLOGY_DIMENSION_HINTS,
    };
  }

  if (reasons.length > 0 || uncertaintyNotes.length > 0) {
    return {
      result: "accept_with_uncertainty",
      reasons,
      uncertaintyNotes,
      summaryTrace,
      fragments: recurrence.fragments,
      provenanceTier,
      latentBackflowGuard: "observation_only",
      boundaryVersion: BOUNDARY_VERSION,
      ontologyPreparationHints: FUTURE_ONTOLOGY_DIMENSION_HINTS,
    };
  }

  return {
    result: "accept",
    reasons: [],
    uncertaintyNotes: [],
    summaryTrace,
    fragments: recurrence.fragments,
    provenanceTier,
    latentBackflowGuard: "observation_only",
    boundaryVersion: BOUNDARY_VERSION,
    ontologyPreparationHints: FUTURE_ONTOLOGY_DIMENSION_HINTS,
  };
}
