import type { ThreadRepository } from "@/src/domain/threads/contracts";
import type {
  CreateReflectiveThreadInput,
  CreateThreadGlossaryAssociationInput,
  CreateThreadObjectAssociationInput,
  ReflectiveThread,
  ReflectiveThreadAssociation,
  ThreadState,
  UpdateReflectiveThreadInput,
} from "@/src/domain/threads/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromReflectiveThreadRow,
  fromThreadGlossaryAssociationRow,
  fromThreadObjectAssociationRow,
  toReflectiveThreadInsertRow,
  toReflectiveThreadUpdateRow,
  toThreadGlossaryAssociationInsertRow,
  toThreadObjectAssociationInsertRow,
  type ReflectiveThreadRow,
  type ThreadGlossaryAssociationRow,
  type ThreadObjectAssociationRow,
} from "@/src/infrastructure/supabase/adapters/thread-row";
import type { ThreadId, UserId } from "@/src/shared/types";

const THREADS_TABLE = "reflective_threads";
const OBJECT_ASSOCIATIONS_TABLE = "thread_object_associations";
const GLOSSARY_ASSOCIATIONS_TABLE = "thread_glossary_associations";

export class SupabaseThreadRepository implements ThreadRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createThread(input: CreateReflectiveThreadInput): Promise<ReflectiveThread> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(THREADS_TABLE)
      .insert(toReflectiveThreadInsertRow(input, now))
      .select("*")
      .single<ReflectiveThreadRow>();

    if (error) {
      throw new Error(`Failed to create reflective thread: ${error.message}`);
    }

    return fromReflectiveThreadRow(data);
  }

  async getThreadById(threadId: ThreadId, userId: UserId): Promise<ReflectiveThread | null> {
    const { data, error } = await this.client
      .from(THREADS_TABLE)
      .select("*")
      .eq("id", threadId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<ReflectiveThreadRow>();

    if (error) {
      throw new Error(`Failed to load reflective thread: ${error.message}`);
    }

    return data ? fromReflectiveThreadRow(data) : null;
  }

  async listThreadsByUser(userId: UserId, limit?: number): Promise<ReflectiveThread[]> {
    let request = this.client
      .from(THREADS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      request = request.limit(Math.floor(limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list reflective threads: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectiveThreadRow(row as ReflectiveThreadRow));
  }

  async listThreadsByReflectiveObject(userId: UserId, reflectiveObjectId: string, limit?: number): Promise<ReflectiveThread[]> {
    let associationRequest = this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .select("thread_id")
      .eq("user_id", userId)
      .eq("reflective_object_id", reflectiveObjectId)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      associationRequest = associationRequest.limit(Math.floor(limit));
    }

    const { data: associationData, error: associationError } = await associationRequest;
    if (associationError) {
      throw new Error(`Failed to list thread-object associations: ${associationError.message}`);
    }

    const threadIds = Array.from(
      new Set((associationData ?? []).map((row) => (row as { thread_id: string }).thread_id).filter(Boolean)),
    );
    if (threadIds.length === 0) {
      return [];
    }

    let threadRequest = this.client
      .from(THREADS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("id", threadIds)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      threadRequest = threadRequest.limit(Math.floor(limit));
    }

    const { data, error } = await threadRequest;
    if (error) {
      throw new Error(`Failed to list reflective threads by object: ${error.message}`);
    }

    const rows = (data ?? []).map((row) => fromReflectiveThreadRow(row as ReflectiveThreadRow));
    const rowsById = new Map(rows.map((row) => [row.id, row] as const));

    return threadIds.map((threadId) => rowsById.get(threadId)).filter((row): row is ReflectiveThread => Boolean(row));
  }

  async updateThread(input: UpdateReflectiveThreadInput): Promise<ReflectiveThread | null> {
    const now = new Date().toISOString();
    const patch = toReflectiveThreadUpdateRow(input, now);

    if (Object.keys(patch).length === 0) {
      return this.getThreadById(input.threadId, input.userId);
    }

    const { data, error } = await this.client
      .from(THREADS_TABLE)
      .update(patch)
      .eq("id", input.threadId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<ReflectiveThreadRow>();

    if (error) {
      throw new Error(`Failed to update reflective thread: ${error.message}`);
    }

    return data ? fromReflectiveThreadRow(data) : null;
  }

  async setThreadState(threadId: ThreadId, userId: UserId, nextState: ThreadState): Promise<ReflectiveThread | null> {
    return this.updateThread({
      threadId,
      userId,
      nextState,
    });
  }

  async archiveThread(threadId: ThreadId, userId: UserId): Promise<ReflectiveThread | null> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(THREADS_TABLE)
      .update({
        state: "archived",
        archived_at: now,
      })
      .eq("id", threadId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<ReflectiveThreadRow>();

    if (error) {
      throw new Error(`Failed to archive reflective thread: ${error.message}`);
    }

    return data ? fromReflectiveThreadRow(data) : null;
  }

  async createObjectAssociation(input: CreateThreadObjectAssociationInput): Promise<ReflectiveThreadAssociation> {
    const { data, error } = await this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .insert(toThreadObjectAssociationInsertRow(input))
      .select("*")
      .single<ThreadObjectAssociationRow>();

    if (error) {
      throw new Error(`Failed to create thread-object association: ${error.message}`);
    }

    return fromThreadObjectAssociationRow(data);
  }

  async createGlossaryAssociation(input: CreateThreadGlossaryAssociationInput): Promise<ReflectiveThreadAssociation> {
    const { data, error } = await this.client
      .from(GLOSSARY_ASSOCIATIONS_TABLE)
      .insert(toThreadGlossaryAssociationInsertRow(input))
      .select("*")
      .single<ThreadGlossaryAssociationRow>();

    if (error) {
      throw new Error(`Failed to create thread-glossary association: ${error.message}`);
    }

    return fromThreadGlossaryAssociationRow(data);
  }

  async listAssociationsByThread(threadId: ThreadId, userId: UserId): Promise<ReflectiveThreadAssociation[]> {
    const { data: objectData, error: objectError } = await this.client
      .from(OBJECT_ASSOCIATIONS_TABLE)
      .select("*")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (objectError) {
      throw new Error(`Failed to list thread-object associations: ${objectError.message}`);
    }

    const { data: glossaryData, error: glossaryError } = await this.client
      .from(GLOSSARY_ASSOCIATIONS_TABLE)
      .select("*")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (glossaryError) {
      throw new Error(`Failed to list thread-glossary associations: ${glossaryError.message}`);
    }

    return [
      ...(objectData ?? []).map((row) => fromThreadObjectAssociationRow(row as ThreadObjectAssociationRow)),
      ...(glossaryData ?? []).map((row) => fromThreadGlossaryAssociationRow(row as ThreadGlossaryAssociationRow)),
    ];
  }
}
