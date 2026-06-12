import type {
  GlossaryAssociationId,
  GlossaryCandidateId,
  GlossaryTermId,
  ObservationFragmentId,
  ObservationId,
  ReflectiveObjectId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";
import type { ObservationCategory } from "@/src/domain/observation/types";

export const GLOSSARY_CANDIDATE_STATES = ["candidate", "pinned", "suppressed", "ignored"] as const;
export type GlossaryCandidateState = (typeof GLOSSARY_CANDIDATE_STATES)[number];

export const GLOSSARY_CANDIDATE_CLASSES = [
  "match_candidate",
  "ambiguous_match_candidate",
  "new_candidate",
] as const;
export type GlossaryCandidateClass = (typeof GLOSSARY_CANDIDATE_CLASSES)[number];

export const GLOSSARY_TERM_STATES = ["active", "archived"] as const;
export type GlossaryTermState = (typeof GLOSSARY_TERM_STATES)[number];

export const GLOSSARY_ENTITY_TYPES = [
  "person",
  "place",
  "animal_or_creature",
  "object",
  "setting_or_space",
  "role",
  "concept",
] as const;
export type GlossaryEntityType = (typeof GLOSSARY_ENTITY_TYPES)[number];

export interface GlossarySuppressionState {
  state: "none" | "suppressed";
  suppressedAt: string | null;
  reason: string | null;
}

export interface GlossaryTerm extends VersionedTimestamps {
  id: GlossaryTermId;
  userId: UserId;
  normalizedKey: string;
  displayLabel: string;
  canonicalLabel: string;
  type: GlossaryEntityType;
  aliases: string[];
  generalNote: string | null;
  appearanceCount: number;
  notes: string | null;
  state: GlossaryTermState;
  suppression: GlossarySuppressionState;
}

export interface GlossaryAppearanceRecord extends VersionedTimestamps {
  id: GlossaryAssociationId;
  userId: UserId;
  entityId: GlossaryTermId;
  dreamId: ReflectiveObjectId;
  appearanceNote: string | null;
  confirmedAt: string;
}

export interface GlossaryCandidate extends VersionedTimestamps {
  id: GlossaryCandidateId;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  normalizedKey: string;
  displayLabel: string;
  sourceCategory: ObservationCategory;
  sourceObservationId: ObservationId | null;
  sourceObservationFragmentId: ObservationFragmentId | null;
  recurrenceCount: number;
  candidateClass: GlossaryCandidateClass;
  proposedEntityIds: GlossaryTermId[];
  state: GlossaryCandidateState;
  suppression: GlossarySuppressionState;
  lastSeenAt: string;
}

export interface GlossaryAssociation extends VersionedTimestamps {
  id: GlossaryAssociationId;
  userId: UserId;
  glossaryTermId: GlossaryTermId;
  reflectiveObjectId: ReflectiveObjectId | null;
  observationId: ObservationId | null;
  observationFragmentId: ObservationFragmentId | null;
  associationLabel: string | null;
}

export interface CreateGlossaryTermInput {
  userId: UserId;
  normalizedKey: string;
  displayLabel: string;
  canonicalLabel: string;
  type: GlossaryEntityType;
  aliases?: string[];
  generalNote?: string | null;
  appearanceCount?: number;
  notes?: string | null;
}

export interface CreateGlossaryAssociationInput {
  userId: UserId;
  glossaryTermId: GlossaryTermId;
  reflectiveObjectId?: ReflectiveObjectId | null;
  observationId?: ObservationId | null;
  observationFragmentId?: ObservationFragmentId | null;
  associationLabel?: string | null;
}

export interface CreateGlossaryAppearanceRecordInput {
  userId: UserId;
  entityId: GlossaryTermId;
  dreamId: ReflectiveObjectId;
  appearanceNote?: string | null;
  confirmedAt: string;
}

export interface CreateGlossaryCandidateInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  normalizedKey: string;
  displayLabel: string;
  sourceCategory: ObservationCategory;
  sourceObservationId?: ObservationId | null;
  sourceObservationFragmentId?: ObservationFragmentId | null;
  recurrenceCount?: number;
  candidateClass?: GlossaryCandidateClass;
  proposedEntityIds?: GlossaryTermId[];
}

export interface GlossaryCandidateLifecycleUpdate {
  candidateId: GlossaryCandidateId;
  userId: UserId;
  nextState: GlossaryCandidateState;
  displayLabel?: string;
  suppressionReason?: string | null;
  appearanceNote?: string | null;
  candidateClass?: GlossaryCandidateClass;
  proposedEntityIds?: GlossaryTermId[];
}

export interface GlossaryTermUpdateInput {
  termId: GlossaryTermId;
  userId: UserId;
  canonicalLabel: string;
  type?: GlossaryEntityType;
  aliases?: string[];
  generalNote?: string | null;
}
