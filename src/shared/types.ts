export type UserId = string;
export type ReflectiveObjectId = string;
export type ThreadId = string;
export type ThreadAssociationId = string;
export type OpeningId = string;
export type OpeningActivationEventId = string;
export type OpeningResponseAssociationId = string;
export type GlossaryTermId = string;
export type GlossaryCandidateId = string;
export type GlossaryAssociationId = string;
export type ReflectiveResponseId = string;
export type ResponseAssociationId = string;
export type ReflectionCandidateId = string;
export type ReflectionId = string;
export type LatentSnapshotId = string;
export type LatentSignalId = string;
export type LatentSuggestionId = string;
export type LatentOpportunityIdentityId = string;
export type LatentGenerationRunId = string;
export type LatentOpportunityManifestationId = string;
export type LatentOpportunityEvidenceBlockId = string;
export type LatentOpportunityEvidenceObservationId = string;
export type LatentOpportunityGlossaryLinkId = string;
export type AnchorIdentityId = string;
export type AnchorManifestationId = string;
export type AnchorParticipationId = string;
export type ObservationId = string;
export type ObservationFragmentId = string;

export type IsoDatetime = string;

export interface VersionedTimestamps {
  createdAt: IsoDatetime;
  updatedAt: IsoDatetime;
}
