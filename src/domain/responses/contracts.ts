import type {
  CreateOpeningActivationEventInput,
  CreateOpeningResponseAssociationInput,
  CreateReflectiveResponseInput,
  CreateResponseObjectAssociationInput,
  CreateResponseThreadAssociationInput,
  OpeningActivationEvent,
  OpeningResponseAssociation,
  ReflectiveResponse,
  ReflectiveResponseAssociation,
  ReflectiveResponseState,
  UpdateReflectiveResponseInput,
} from "@/src/domain/responses/types";
import type { OpeningId, ReflectiveObjectId, ReflectiveResponseId, ThreadId, UserId } from "@/src/shared/types";

export interface OpeningActivationEventCursor {
  createdAt: string;
  id: string;
}

export interface OpeningActivationEventWindowQuery {
  userId: UserId;
  limit: number;
  beforeCreatedAt?: string;
  beforeCursor?: OpeningActivationEventCursor;
  openingId?: OpeningId;
}

export interface ReflectiveResponseRepository {
  createResponse(input: CreateReflectiveResponseInput): Promise<ReflectiveResponse>;
  getResponseById(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponse | null>;
  getResponseByIdIncludingArchived?: (responseId: ReflectiveResponseId, userId: UserId) => Promise<ReflectiveResponse | null>;
  listResponsesByUser(userId: UserId, limit?: number): Promise<ReflectiveResponse[]>;
  listResponsesByReflectiveObject?: (
    userId: UserId,
    reflectiveObjectId: ReflectiveObjectId,
    limit?: number,
  ) => Promise<ReflectiveResponse[]>;
  updateResponse(input: UpdateReflectiveResponseInput): Promise<ReflectiveResponse | null>;
  setResponseState(responseId: ReflectiveResponseId, userId: UserId, nextState: ReflectiveResponseState): Promise<ReflectiveResponse | null>;
  archiveResponse(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponse | null>;

  createObjectAssociation(input: CreateResponseObjectAssociationInput): Promise<ReflectiveResponseAssociation>;
  createThreadAssociation(input: CreateResponseThreadAssociationInput): Promise<ReflectiveResponseAssociation>;
  removeObjectAssociation(responseId: ReflectiveResponseId, reflectiveObjectId: ReflectiveObjectId, userId: UserId): Promise<boolean>;
  removeThreadAssociation(responseId: ReflectiveResponseId, threadId: ThreadId, userId: UserId): Promise<boolean>;
  listAssociationsByResponse(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponseAssociation[]>;

  createOpeningActivationEvent(input: CreateOpeningActivationEventInput): Promise<OpeningActivationEvent>;
  listOpeningActivationEventsByWindow(query: OpeningActivationEventWindowQuery): Promise<OpeningActivationEvent[]>;
  createOpeningResponseAssociation(input: CreateOpeningResponseAssociationInput): Promise<OpeningResponseAssociation>;
  removeOpeningResponseAssociation(openingId: OpeningId, responseId: ReflectiveResponseId, userId: UserId): Promise<boolean>;
  listOpeningResponseAssociationsByOpening(openingId: OpeningId, userId: UserId): Promise<OpeningResponseAssociation[]>;
}
