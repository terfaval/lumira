import type {
  CreateObservationFragmentInput,
  CreateObservationInput,
  ObservationEvidenceAdequacy,
  ObservationCategory,
  ObservationSummaryTrace,
  ObservationSource,
} from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const INTERPRETIVE_MARKERS = [
  "means",
  "symbolizes",
  "represents",
  "diagnosis",
  "trauma",
  "proves",
  "must be",
  "higher reality",
  "ultimate truth",
  "another dimension",
  "prophetic certainty",
  "cosmic revelation",
  "spiritual awakening",
];

interface BuildScaffoldInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  sourceText: string;
  source?: ObservationSource;
}

function isInterpretiveSentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();

  return INTERPRETIVE_MARKERS.some((marker) => lower.includes(marker));
}

function classifyCategory(sentence: string): ObservationCategory {
  const lower = sentence.toLowerCase();

  if (
    /\b(impossible geometry|geometry (?:kept )?changing|room (?:kept )?changing|hallway looped|looping (?:corridor|space)|space looped|architecture shifted|walls moved|door led back|labyrinth)\b/.test(lower)
  ) {
    return "spatial_instability";
  }

  if (
    /\b(without transition|scene jumped|abruptly elsewhere|no transition|missing time|memory gap|suddenly elsewhere|woke up in .* still dreaming|still dreaming|false awakening)\b/.test(lower)
  ) {
    return "continuity_fragment";
  }

  if (
    /\b(felt unreal|seemed unreal|not real|hyperreal|reality felt thin|distorted reality|altered realism)\b/.test(lower)
  ) {
    return "altered_realism";
  }

  if (
    /\b(still dreaming|false awakening|dream felt unstable|dream felt fragile|dream-state instability|lucid|dreamlike|woke up but)\b/.test(lower)
  ) {
    return "dream_state_quality";
  }

  if (
    /\b(couldn'?t move|could not move|cannot move|unable to move|couldn'?t speak|could not speak|cannot speak|unable to speak|speech became impossible|paralyzed|paralysed|frozen|stuck|blocked|couldn'?t run|could not run|unable to run|intentional|deliberate|chose to|decided to|being carried|passive|control returned|lost control|involuntary)\b/.test(lower)
  ) {
    return "agency_state";
  }

  if (
    /\b(noticed|realized|realised|aware|awareness|lucid|suspected i was dreaming|am i dreaming|questioned whether|questioned reality|tested if|it felt like a dream)\b/.test(lower)
  ) {
    return "metacognitive_moment";
  }

  if (
    /\b(became|becoming|shifted into|intensified|softened|dissolved|collapsed back|grew into|turned into|gradually|suddenly)\b/.test(lower) &&
    /\b(fear|unease|panic|calm|relief|curiosity|tension|urgency|dread|warmth)\b/.test(lower)
  ) {
    return "affect_transition";
  }

  if (
    /\b(simultaneously|at once|mixed with|conflicting|ambivalent|contradictory|emotionally unresolved|unclear emotional)\b/.test(lower) ||
    /\bboth\b.{0,32}\band\b/.test(lower)
  ) {
    return "emotional_contradiction";
  }

  if (
    /\b(atmosphere|air felt|diffuse tension|oppressive|charged silence|emotional heaviness|environment carried|scene felt tense|ambient unease)\b/.test(lower)
  ) {
    return "affective_atmosphere";
  }

  if (/\b(where|room|house|street|forest|city|inside|outside)\b/.test(lower)) {
    return "location";
  }

  if (/\b(mother|father|friend|child|person|man|woman|stranger|figure|someone|he|she|they)\b/.test(lower)) {
    return "actor";
  }

  if (/\b(ran|walked|moved|chased|spoke|talked|fought|hugged|followed)\b/.test(lower)) {
    return "interaction";
  }

  if (/\b(afraid|calm|sad|joy|anxious|angry|relieved)\b/.test(lower)) {
    return "emotion";
  }

  if (/\b(suddenly|then|after|before|next|later)\b/.test(lower)) {
    return "transition";
  }

  if (/\b(body|breath|heart|hands|legs|heavy|light|frozen)\b/.test(lower)) {
    return "body_state";
  }

  if (/\b(lucid|dream|woke|foggy|vivid)\b/.test(lower)) {
    return "dream_quality";
  }

  if (/\b(again|recurring|same|repeated)\b/.test(lower)) {
    return "recurrence_candidate";
  }

  if (/\b(tree|car|door|water|phone|book|animal|object)\b/.test(lower)) {
    return "object";
  }

  return "scene";
}

function splitSentences(sourceText: string): string[] {
  const raw = sourceText
    .split(/[\n.!?]+/g)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  // Keep local context when punctuation creates tiny detached fragments.
  const merged: string[] = [];
  for (const segment of raw) {
    if (segment.length < 18 && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${segment}`.trim();
      continue;
    }
    merged.push(segment);
  }

  return merged;
}

function classifyEvidenceAdequacy(fragment: CreateObservationFragmentInput): ObservationEvidenceAdequacy {
  if (fragment.evidence.spanStart !== null && fragment.evidence.spanEnd !== null) {
    return "strong_span";
  }

  if (fragment.evidence.snippet.trim().length >= 24) {
    return "snippet_only";
  }

  return "weak_fallback";
}

function buildSummaryTrace(fragments: CreateObservationFragmentInput[]): ObservationSummaryTrace[] {
  return fragments.slice(0, 3).map((fragment) => ({
    fragmentPosition: fragment.position,
    reason: "explicit_anchor",
    strength: "weak",
  }));
}

export function buildDescriptiveObservationScaffold(input: BuildScaffoldInput): CreateObservationInput {
  const sentences = splitSentences(input.sourceText).filter((sentence) => !isInterpretiveSentence(sentence));

  const fragments: CreateObservationFragmentInput[] = sentences.map((sentence, index) => ({
    category: classifyCategory(sentence),
    fragmentText: sentence,
    position: index,
    evidenceAdequacy: "snippet_only",
    evidence: {
      snippet: sentence,
      spanStart: null,
      spanEnd: null,
      contextLabel: "raw_sentence",
    },
    uncertaintyNote: null,
  }));

  const safeFragments: CreateObservationFragmentInput[] =
    fragments.length > 0
      ? fragments
      : [
          {
            category: "scene",
            fragmentText: "No stable descriptive fragment detected.",
            position: 0,
            evidenceAdequacy: "weak_fallback",
            evidence: {
              snippet: input.sourceText.trim().slice(0, 160) || "No source text available.",
              spanStart: null,
              spanEnd: null,
              contextLabel: "fallback",
            },
            uncertaintyNote: "Descriptive extraction remained minimal due to low explicit detail.",
          },
        ];

  const enrichedFragments = safeFragments.map((fragment) => ({
    ...fragment,
    evidenceAdequacy: classifyEvidenceAdequacy(fragment),
  }));

  return {
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    source: input.source ?? "system_descriptive_extract",
    provenanceTier: "system_extract",
    semanticPolicyResult: "accept_with_uncertainty",
    semanticPolicyReasons: ["scaffold_mode_descriptive_only"],
    summaryTrace: buildSummaryTrace(enrichedFragments),
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_semantic_guardrails_v1",
    summary: "Descriptive orientation scaffold extracted from reflective material.",
    uncertaintyNotes: ["Descriptive scaffold only; interpretation intentionally omitted."],
    fragments: enrichedFragments,
  };
}
