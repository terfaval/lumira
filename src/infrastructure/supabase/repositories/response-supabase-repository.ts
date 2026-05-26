import type { OpeningActivationEventWindowQuery, ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
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
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromReflectiveResponseRow,
  fromOpeningActivationEventRow,
  fromOpeningResponseAssociationAsResponseAssociation,
  fromOpeningResponseAssociationRow,
  fromResponseObjectAssociationRow,
  fromResponseThreadAssociationRow,
  toOpeningActivationEventInsertRow,
  toOpeningResponseAssociationInsertRow,
  toReflectiveResponseInsertRow,
  toReflectiveResponseUpdateRow,
  toResponseObjectAssociationInsertRow,
  toResponseThreadAssociationInsertRow,
  type OpeningActivationEventRow,
  type OpeningResponseAssociationRow,
  type ReflectiveResponseRow,
  type ResponseObjectAssociationRow,
  type ResponseThreadAssociationRow,
} from "@/src/infrastructure/supabase/adapters/response-row";
import type { OpeningId, ReflectiveObjectId, ReflectiveResponseId, ThreadId, UserId } from "@/src/shared/types";

const RESPONSES_TABLE = "reflective_responses";
const OBJECT_ASSOCIATIONS_TABLE = "response_object_associations";
const THREAD_ASSOCIATIONS_TABLE = "response_thread_associations";
const OPENING_ASSOCIATIONS_TABLE = "opening_response_associations";
const OPENING_ACTIVATION_EVENTS_TABLE = "opening_activation_events";

export class SupabaseReflectiveResponseRepository implements ReflectiveResponseRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createResponse(input: CreateReflectiveResponseInput): Promise<ReflectiveResponse> {
    const { data, error } = await this.client
      .from(RESPONSES_TABLE)
      .insert(toReflectiveResponseInsertRow(input))
      .select("*")
      .single<ReflectiveResponseRow>();

    if (error) {
      throw new Error(`Failed to create reflective response: ${error.message}`);
    }

    return fromReflectiveResponseRow(data);
  }

  async getResponseById(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponse | null> {
    const { data, error } = await this.client
      .from(RESPONSES_TABLE)
      .select("*")
      .eq("id", responseId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<ReflectiveResponseRow>();

    if (error) {
      throw new Error(`Failed to load reflective response: ${error.message}`);
    }

    return data ? fromReflectiveResponseRow(data) : null;
  }

  async getResponseByIdIncludingArchived(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponse | null> {
    const { data, error } = await this.client
      .from(RESPONSES_TABLE)
      .select("*")
      .eq("id", responseId)
      .eq("user_id", userId)
      .maybeSingle<ReflectiveResponseRow>();

    if (error) {
      throw new Error(`Failed to load reflective response including archived state: ${error.message}`);
    }

    return data ? fromReflectiveResponseRow(data) : null;
  }

  async listResponsesByUser(userId: UserId, limit?: number): Promise<ReflectiveResponse[]> {
    let request = this.client
      .from(RESPONSES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      request = request.limit(Math.floor(limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list reflective responses: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectiveResponseRow(row as ReflectiveResponseRow));
  }

  async listResponsesByReflectiveObject(
    userId: UserId,
    reflectiveObjectId: ReflectiveObjectId,
    limit?: number,
  ): Promise<ReflectiveResponse[]> {
    let associationRequest = this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .select("response_id")
      .eq("user_id", userId)
      .eq("reflective_object_id", reflectiveObjectId)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      associationRequest = associationRequest.limit(Math.floor(limit));
    }

    const { data: associationData, error: associationError } = await associationRequest;
    if (associationError) {
      throw new Error(`Failed to list response-object associations: ${associationError.message}`);
    }

    const responseIds = Array.from(
      new Set((associationData ?? []).map((row) => (row as { response_id: string }).response_id).filter(Boolean)),
    );
    if (responseIds.length === 0) {
      return [];
    }

    let responseRequest = this.client
      .from(RESPONSES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("id", responseIds)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      responseRequest = responseRequest.limit(Math.floor(limit));
    }

    const { data, error } = await responseRequest;
    if (error) {
      throw new Error(`Failed to list reflective responses by object: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectiveResponseRow(row as ReflectiveResponseRow));
  }

  async updateResponse(input: UpdateReflectiveResponseInput): Promise<ReflectiveResponse | null> {
    const patch = toReflectiveResponseUpdateRow(input);
    if (Object.keys(patch).length === 0) {
      return this.getResponseById(input.responseId, input.userId);
    }

    const { data, error } = await this.client
      .from(RESPONSES_TABLE)
      .update(patch)
      .eq("id", input.responseId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<ReflectiveResponseRow>();

    if (error) {
      throw new Error(`Failed to update reflective response: ${error.message}`);
    }

    return data ? fromReflectiveResponseRow(data) : null;
  }

  async setResponseState(
    responseId: ReflectiveResponseId,
    userId: UserId,
    nextState: ReflectiveResponseState,
  ): Promise<ReflectiveResponse | null> {
    return this.updateResponse({
      responseId,
      userId,
      nextState,
    });
  }

  async archiveResponse(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponse | null> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(RESPONSES_TABLE)
      .update({
        state: "archived",
        archived_at: now,
      })
      .eq("id", responseId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<ReflectiveResponseRow>();

    if (error) {
      throw new Error(`Failed to archive reflective response: ${error.message}`);
    }

    return data ? fromReflectiveResponseRow(data) : null;
  }

  async createObjectAssociation(input: CreateResponseObjectAssociationInput): Promise<ReflectiveResponseAssociation> {
    const { data, error } = await this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .insert(toResponseObjectAssociationInsertRow(input))
      .select("*")
      .single<ResponseObjectAssociationRow>();

    if (error) {
      throw new Error(`Failed to create response-object association: ${error.message}`);
    }

    return fromResponseObjectAssociationRow(data);
  }

  async createThreadAssociation(input: CreateResponseThreadAssociationInput): Promise<ReflectiveResponseAssociation> {
    const { data, error } = await this.client
      .from(THREAD_ASSOCIATIONS_TABLE)
      .insert(toResponseThreadAssociationInsertRow(input))
      .select("*")
      .single<ResponseThreadAssociationRow>();

    if (error) {
      throw new Error(`Failed to create response-thread association: ${error.message}`);
    }

    return fromResponseThreadAssociationRow(data);
  }

  async removeObjectAssociation(responseId: ReflectiveResponseId, reflectiveObjectId: ReflectiveObjectId, userId: UserId): Promise<boolean> {
    const { error, count } = await this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .delete({ count: "exact" })
      .eq("response_id", responseId)
      .eq("reflective_object_id", reflectiveObjectId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to remove response-object association: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async removeThreadAssociation(responseId: ReflectiveResponseId, threadId: ThreadId, userId: UserId): Promise<boolean> {
    const { error, count } = await this.client
      .from(THREAD_ASSOCIATIONS_TABLE)
      .delete({ count: "exact" })
      .eq("response_id", responseId)
      .eq("thread_id", threadId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to remove response-thread association: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async listAssociationsByResponse(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectiveResponseAssociation[]> {
    const { data: objectData, error: objectError } = await this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .select("*")
      .eq("response_id", responseId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (objectError) {
      throw new Error(`Failed to list response-object associations: ${objectError.message}`);
    }

    const { data: threadData, error: threadError } = await this.client
      .from(THREAD_ASSOCIATIONS_TABLE)
      .select("*")
      .eq("response_id", responseId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (threadError) {
      throw new Error(`Failed to list response-thread associations: ${threadError.message}`);
    }

    const { data: openingData, error: openingError } = await this.client
      .from(OPENING_ASSOCIATIONS_TABLE)
      .select("*")
      .eq("response_id", responseId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (openingError) {
      throw new Error(`Failed to list response-opening associations: ${openingError.message}`);
    }

    return [
      ...(objectData ?? []).map((row) => fromResponseObjectAssociationRow(row as ResponseObjectAssociationRow)),
      ...(threadData ?? []).map((row) => fromResponseThreadAssociationRow(row as ResponseThreadAssociationRow)),
      ...(openingData ?? []).map((row) => fromOpeningResponseAssociationAsResponseAssociation(row as OpeningResponseAssociationRow)),
    ];
  }

  async createOpeningActivationEvent(input: CreateOpeningActivationEventInput): Promise<OpeningActivationEvent> {
    const { data, error } = await this.client
      .from(OPENING_ACTIVATION_EVENTS_TABLE)
      .insert(toOpeningActivationEventInsertRow(input))
      .select("*")
      .single<OpeningActivationEventRow>();

    if (error) {
      throw new Error(`Failed to create opening activation event: ${error.message}`);
    }

    return fromOpeningActivationEventRow(data);
  }

  async listOpeningActivationEventsByWindow(query: OpeningActivationEventWindowQuery): Promise<OpeningActivationEvent[]> {
    let request = this.client
      .from(OPENING_ACTIVATION_EVENTS_TABLE)
      .select("*")
      .eq("user_id", query.userId);

    if (query.beforeCursor) {
      request = request.lte("created_at", query.beforeCursor.createdAt);
    } else if (query.beforeCreatedAt) {
      request = request.lt("created_at", query.beforeCreatedAt);
    }

    if (query.openingId) {
      request = request.eq("opening_id", query.openingId);
    }

    const fetchLimit = query.beforeCursor ? Math.max(query.limit, query.limit * 2) : query.limit;
    const { data, error } = await request
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(fetchLimit);
    if (error) {
      throw new Error(`Failed to list opening activation events: ${error.message}`);
    }

    const rows = (data ?? []) as OpeningActivationEventRow[];
    if (!query.beforeCursor) {
      return rows.map((row) => fromOpeningActivationEventRow(row));
    }

    const cursor = query.beforeCursor;
    const filtered = rows.filter((row) => {
      if (row.created_at < cursor.createdAt) {
        return true;
      }

      if (row.created_at > cursor.createdAt) {
        return false;
      }

      return row.id < cursor.id;
    });

    return filtered.slice(0, query.limit).map((row) => fromOpeningActivationEventRow(row));
  }

  async createOpeningResponseAssociation(input: CreateOpeningResponseAssociationInput): Promise<OpeningResponseAssociation> {
    const { data, error } = await this.client
      .from(OPENING_ASSOCIATIONS_TABLE)
      .insert(toOpeningResponseAssociationInsertRow(input))
      .select("*")
      .single<OpeningResponseAssociationRow>();

    if (error) {
      throw new Error(`Failed to create opening-response association: ${error.message}`);
    }

    return fromOpeningResponseAssociationRow(data);
  }

  async removeOpeningResponseAssociation(openingId: OpeningId, responseId: ReflectiveResponseId, userId: UserId): Promise<boolean> {
    const { error, count } = await this.client
      .from(OPENING_ASSOCIATIONS_TABLE)
      .delete({ count: "exact" })
      .eq("opening_id", openingId)
      .eq("response_id", responseId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to remove opening-response association: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async listOpeningResponseAssociationsByOpening(openingId: OpeningId, userId: UserId): Promise<OpeningResponseAssociation[]> {
    const { data, error } = await this.client
      .from(OPENING_ASSOCIATIONS_TABLE)
      .select("*")
      .eq("opening_id", openingId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list opening-response associations: ${error.message}`);
    }

    return (data ?? []).map((row) => fromOpeningResponseAssociationRow(row as OpeningResponseAssociationRow));
  }
}
