import type {
  CreateObservationFragmentInput,
  ObservationCategory,
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
];
const ALTERED_REALISM_CUES = [
  "felt unreal",
  "seemed unreal",
  "not real",
  "hyperreal",
  "reality felt thin",
  "distorted reality",
  "altered realism",
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
  if (source === "system_descriptive_extract") {
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

function hasAgencyCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return AGENCY_CUES.some((cue) => lower.includes(cue));
}

function hasMetacognitiveCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return METACOGNITIVE_CUES.some((cue) => lower.includes(cue));
}

function hasAffectTone(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return AFFECT_TONE_MARKERS.some((cue) => lower.includes(cue));
}

function hasAffectTransitionCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return hasAffectTone(lower) && AFFECT_TRANSITION_CUES.some((cue) => lower.includes(cue));
}

function hasEmotionalContradictionCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  const hasContradictionMarker = EMOTIONAL_CONTRADICTION_CUES.some((cue) => lower.includes(cue));
  if (hasContradictionMarker) {
    return true;
  }
  return hasAffectTone(lower) && /\bboth\b.{0,32}\band\b/.test(lower);
}

function hasAffectiveAtmosphereCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return AFFECTIVE_ATMOSPHERE_CUES.some((cue) => lower.includes(cue));
}

function hasSpatialInstabilityCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return SPATIAL_INSTABILITY_CUES.some((cue) => lower.includes(cue));
}

function hasDreamStateQualityCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return DREAM_STATE_QUALITY_CUES.some((cue) => lower.includes(cue));
}

function hasContinuityFragmentCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
  return CONTINUITY_FRAGMENT_CUES.some((cue) => lower.includes(cue));
}

function hasAlteredRealismCue(fragmentText: string): boolean {
  const lower = normalize(fragmentText);
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

function hasCategoryCoherenceRisk(category: ObservationCategory, fragmentText: string): boolean {
  if (category === "emotion") {
    // Guard against symbolic/diagnostic spillover inside emotional descriptions.
    return containsAny(fragmentText, ["therefore", "so it means", "proves"]);
  }

  if (category === "agency_state") {
    return !hasAgencyCue(fragmentText);
  }

  if (category === "metacognitive_moment") {
    return !hasMetacognitiveCue(fragmentText);
  }

  if (category === "affect_transition") {
    return !hasAffectTransitionCue(fragmentText);
  }

  if (category === "emotional_contradiction") {
    return !hasEmotionalContradictionCue(fragmentText);
  }

  if (category === "affective_atmosphere") {
    return !hasAffectiveAtmosphereCue(fragmentText);
  }

  if (category === "spatial_instability") {
    return !hasSpatialInstabilityCue(fragmentText);
  }

  if (category === "dream_state_quality") {
    return !hasDreamStateQualityCue(fragmentText);
  }

  if (category === "continuity_fragment") {
    return !hasContinuityFragmentCue(fragmentText);
  }

  if (category === "altered_realism") {
    return !hasAlteredRealismCue(fragmentText);
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
    if (hasCategoryCoherenceRisk(fragment.category, fragment.fragmentText)) {
      reasons.push(`category_coherence_risk:${fragment.category}`);
      uncertaintyNotes.push(`Category coherence risk detected for ${fragment.category} fragment.`);
    }
  }

  const weakEvidenceCount = recurrence.fragments.filter((fragment) => fragment.evidenceAdequacy === "weak_fallback").length;
  const generatedTrace = buildSummaryTrace(normalizedSummary, recurrence.fragments);
  const summaryTrace = input.requestedSummaryTrace && input.requestedSummaryTrace.length > 0
    ? input.requestedSummaryTrace
    : generatedTrace;

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
