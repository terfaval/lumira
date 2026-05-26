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
export type LatentSnapshotId = string;
export type LatentSignalId = string;
export type LatentSuggestionId = string;
export type ObservationId = string;
export type ObservationFragmentId = string;

export type IsoDatetime = string;

export interface VersionedTimestamps {
  createdAt: IsoDatetime;
  updatedAt: IsoDatetime;
}
