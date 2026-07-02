import type {
  OpportunityConstructorBoundarySignalKind,
  OpportunityConstructorObservationCategory,
  OpportunityConstructorPriorityReflectiveObjectType,
  OpportunityConstructorSemanticPolicyResult,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import type { ObservationLanguage } from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export type DiscoveryCandidateOrigin = "dream_originated" | "context_revealed";
export const DISCOVERY_CUE_SIGNAL_KINDS = [
  "transition",
  "search",
  "absence",
  "repair",
  "late_scene_salience",
] as const;
export type DiscoveryCueSignalKind = (typeof DISCOVERY_CUE_SIGNAL_KINDS)[number];
export const DISCOVERY_PROVISIONAL_STRUCTURE_TYPES = [
  "relationship",
  "transition",
  "tension",
  "contradiction",
  "gap",
  "unresolved_pattern",
  "salience_signal",
  "search_structure",
  "repair_sequence",
] as const;
export type DiscoveryProvisionalStructureType = (typeof DISCOVERY_PROVISIONAL_STRUCTURE_TYPES)[number];

export interface DiscoveryInputPacket {
  generationContext: {
    runtimeVersion: "latent_discovery_v1";
    userId: UserId;
    priorityReflectiveObjectId: ReflectiveObjectId;
    priorityReflectiveObjectType: OpportunityConstructorPriorityReflectiveObjectType;
    priorityReflectiveObjectTitle: string;
    objectLanguage: ObservationLanguage;
    observationBundleId: string;
    observationRuntimeVersion: string;
    semanticPolicyResult: OpportunityConstructorSemanticPolicyResult;
    bundleUncertaintyNotes: string[];
  };
  discoveryPolicy: {
    persistence: "ephemeral";
    recreatableFromUpstream: true;
    countsAsSystemMemory: false;
  };
  priorityObject: {
    content?: string;
    summary?: string;
  };
  scenes: Array<{
    sceneRowId: string;
    sceneStableId: string;
    position: number;
    summary: string;
    evidenceSnippet: string;
    boundarySignals: Array<{
      kind: OpportunityConstructorBoundarySignalKind;
      note: string;
    }>;
    derivedStructures: {
      actors: string[];
      locations: string[];
      objects: string[];
      interactions: string[];
      affect: string[];
      agency: string[];
      metacognition: string[];
      phenomenology: string[];
    };
    observations: Array<{
      observationV2SceneObservationId: string;
      observationStableId: string;
      position: number;
      text: string;
      category: OpportunityConstructorObservationCategory;
      evidence: Array<{
        snippet: string;
        spanStart: number | null;
        spanEnd: number | null;
      }>;
      uncertaintyNote: string | null;
    }>;
  }>;
}

export interface DiscoveryCuePacket {
  generationContext: {
    runtimeVersion: "latent_discovery_v1";
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  sceneCues: Array<{
    sceneRef: string;
    position: number;
    repeatedEntities: string[];
    categoryNeighborhoods: Array<{
      category: OpportunityConstructorObservationCategory;
      observationRefs: string[];
    }>;
    cueSignals: Array<{
      kind: DiscoveryCueSignalKind;
      note: string;
      observationRefs: string[];
    }>;
  }>;
}

export interface DiscoveryOutputPacket {
  generationContext: {
    runtimeVersion: "latent_discovery_v1";
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  candidateStructures: DiscoveryCandidateStructure[];
}

export interface DiscoveryCandidateStructure {
  candidateId: string;
  origin: DiscoveryCandidateOrigin;
  sceneRefs: string[];
  evidenceGroups: Array<{
    groupId: string;
    sceneRef: string;
    observationRefs: string[];
    boundaryNotes: string[];
  }>;
  provisionalStructureType: DiscoveryProvisionalStructureType;
  structureSketch: {
    nodes: string[];
    relations: string[];
    tensions: string[];
    gaps: string[];
  };
  distinctnessRationale: string;
  uncertainty: string[];
}

export interface ValidatedDiscoveryOutput extends DiscoveryOutputPacket {
  inputPacket: DiscoveryInputPacket;
}

export type DiscoveryValidationResult =
  | {
      ok: true;
      value: ValidatedDiscoveryOutput;
    }
  | {
      ok: false;
      reason: string;
      details?: Record<string, unknown>;
    };

export type DiscoveryGenerationResult =
  | {
      mode: "generated";
      output: DiscoveryOutputPacket;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };

export type DiscoveryLlmGenerationResult =
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };
