import type {
  LatentAuthorityProvenance,
  LatentContextProvenance,
  LatentExecutionProvenance,
} from "@/src/domain/latent-v2/types";
import {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
} from "@/src/domain/latent-v2/authority-provenance";
import type { OpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor/types";

const EXECUTION_PROVIDER = "openai";
const EXECUTION_MODEL = "gpt-4.1-mini";
const EXECUTION_REQUEST_TIMEOUT_MS = 180_000;
const EXECUTION_RESPONSE_FORMAT_TYPE = "json_schema";
const EXECUTION_RESPONSE_SCHEMA_NAME = "lumira_latent_opportunity_constructor_v1";
const EXECUTION_RESPONSE_STRICT = true;

export type {
  LatentAuthorityProvenance,
  LatentContextProvenance,
  LatentExecutionProvenance,
} from "@/src/domain/latent-v2/types";

export interface ComposedOpportunityConstructorInput {
  packet: OpportunityConstructorInputPacket;
  authorityProvenance: LatentAuthorityProvenance;
  contextProvenance: LatentContextProvenance;
}

export {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
} from "@/src/domain/latent-v2/authority-provenance";

export function projectAuthorityProvenance(input: {
  packet: OpportunityConstructorInputPacket;
  observationBundleUncertaintyNotes: string[];
}): LatentAuthorityProvenance {
  return {
    dream: {
      priorityReflectiveObjectId: input.packet.generationContext.priorityReflectiveObjectId,
      title: input.packet.generationContext.priorityReflectiveObjectTitle,
      objectLanguage: input.packet.generationContext.objectLanguage,
      content: input.packet.priorityObject.content ?? null,
      summary: input.packet.priorityObject.summary ?? null,
    },
    observation: {
      observationBundleId: input.packet.generationContext.observationBundleId,
      observationRuntimeVersion: input.packet.generationContext.observationRuntimeVersion,
      semanticPolicyResult: input.packet.generationContext.semanticPolicyResult,
      bundleUncertaintyNotes: [...input.observationBundleUncertaintyNotes],
      scenes: input.packet.scenes.map((scene) => ({
        sceneRowId: scene.sceneRowId,
        sceneStableId: scene.sceneStableId,
        position: scene.position,
        summary: scene.summary,
        evidenceSnippet: scene.evidenceSnippet,
        boundarySignals: scene.boundarySignals.map((signal) => ({
          kind: signal.kind,
          note: signal.note,
        })),
        derivedStructures: Object.fromEntries(
          Object.entries(scene.derivedStructures).map(([key, value]) => [key, [...value]]),
        ),
      })),
      observations: input.packet.observations.map((observation) => ({
        observationV2SceneObservationId: observation.observationV2SceneObservationId,
        sceneRowId: observation.sceneRowId,
        sceneStableId: observation.sceneStableId,
        observationStableId: observation.observationStableId,
        position: observation.position,
        text: observation.text,
        category: observation.category,
        evidence: observation.evidence.map((evidence) => ({
          snippet: evidence.snippet,
          spanStart: evidence.spanStart,
          spanEnd: evidence.spanEnd,
        })),
        uncertaintyNote: observation.uncertaintyNote,
      })),
    },
    glossary: {
      confirmedTerms: input.packet.glossaryContext.confirmedTerms.map((term) => ({
        glossaryTermId: term.glossaryTermId,
        displayLabel: term.displayLabel,
        normalizedKey: term.normalizedKey,
        termType: term.termType,
        userNotes: term.userNotes,
        appearanceCount: term.appearanceCount,
        recentAppearanceObjectIds: [...term.recentAppearanceObjectIds],
      })),
      appearanceRecords: input.packet.glossaryContext.appearanceRecords.map((record) => ({
        appearanceRecordId: record.appearanceRecordId,
        glossaryTermId: record.glossaryTermId,
        reflectiveObjectId: record.reflectiveObjectId,
        displayLabelAtAppearance: record.displayLabelAtAppearance,
        sourceObservationId: record.sourceObservationId,
      })),
    },
    reflections: input.packet.reflectionContext.reflections.map((reflection) => ({
      reflectionId: reflection.reflectionId,
      threadId: reflection.threadId,
      sourceResponseId: reflection.sourceResponseId,
      sourceOpeningId: reflection.sourceOpeningId,
      sourceReflectiveObjectIds: [...reflection.sourceReflectiveObjectIds],
      statement: reflection.statement,
      pattern: [...reflection.pattern],
      admittedAt: reflection.admittedAt,
    })),
  };
}

export function projectContextProvenance(input: {
  packet: OpportunityConstructorInputPacket;
  truncationNote: string | null;
}): LatentContextProvenance {
  return {
    existingOpportunityContext: {
      identities: input.packet.existingOpportunityContext.identities.map((identity) => ({
        identityId: identity.identityId,
        primaryCategory: identity.primaryCategory,
        secondaryCategories: [...identity.secondaryCategories],
        lifecycleState: identity.lifecycleState,
        latestStructure: {
          structureType: identity.latestStructure.structureType,
          nodes: [...identity.latestStructure.nodes],
        },
        recentManifestationSummaries: identity.recentManifestationSummaries.map((summary) => ({
          manifestationId: summary.manifestationId,
          priorityReflectiveObjectId: summary.priorityReflectiveObjectId,
          structure: JSON.parse(JSON.stringify(summary.structure)) as Record<string, unknown>,
          primaryEvidenceObservationTexts: [...summary.primaryEvidenceObservationTexts],
        })),
      })),
    },
    truncationNote: input.truncationNote,
  };
}

export function captureExecutionProvenance(
  packet: OpportunityConstructorInputPacket,
): LatentExecutionProvenance {
  return {
    constructorRuntimeVersion: packet.generationContext.runtimeVersion,
    llm: {
      provider: EXECUTION_PROVIDER,
      model: EXECUTION_MODEL,
      requestTimeoutMs: EXECUTION_REQUEST_TIMEOUT_MS,
      responseFormat: {
        type: EXECUTION_RESPONSE_FORMAT_TYPE,
        schemaName: EXECUTION_RESPONSE_SCHEMA_NAME,
        strict: EXECUTION_RESPONSE_STRICT,
      },
    },
  };
}
