import type {
  CreateReflectiveObjectInput,
  ReflectiveObject,
  ReflectiveObjectMetadata,
  ReflectiveObjectState,
  ReflectiveObjectType,
  UpdateReflectiveObjectInput,
} from "@/src/domain/reflective-objects/types";

const ALLOWED_OBJECT_TYPES: ReflectiveObjectType[] = ["dream", "journal_entry", "memory", "reflective_note"];
const ALLOWED_STATES: ReflectiveObjectState[] = ["active", "archived"];

type JsonObject = Record<string, unknown>;

export interface ReflectiveObjectRow {
  id: string;
  user_id: string;
  object_type: ReflectiveObjectType;
  title: string;
  primary_content: string;
  source_context: "manual" | "imported" | "runtime-generated";
  state: ReflectiveObjectState;
  metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ReflectiveObjectInsertRow {
  user_id: string;
  object_type: ReflectiveObjectType;
  title: string;
  primary_content: string;
  source_context: "manual" | "imported" | "runtime-generated";
  state: ReflectiveObjectState;
  metadata: JsonObject;
}

export interface ReflectiveObjectUpdateRow {
  title?: string;
  primary_content?: string;
  source_context?: "manual" | "imported" | "runtime-generated";
  metadata?: JsonObject;
}

function asMetadata(input: JsonObject | null): ReflectiveObjectMetadata {
  if (!input) {
    return {};
  }

  const result: ReflectiveObjectMetadata = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      result[key] = value;
    }
  }

  return result;
}

function assertAllowedObjectType(value: string): asserts value is ReflectiveObjectType {
  if (!ALLOWED_OBJECT_TYPES.includes(value as ReflectiveObjectType)) {
    throw new Error(`Unsupported reflective object type: ${value}`);
  }
}

function assertAllowedState(value: string): asserts value is ReflectiveObjectState {
  if (!ALLOWED_STATES.includes(value as ReflectiveObjectState)) {
    throw new Error(`Unsupported reflective object state: ${value}`);
  }
}

export function fromReflectiveObjectRow(row: ReflectiveObjectRow): ReflectiveObject {
  assertAllowedObjectType(row.object_type);
  assertAllowedState(row.state);

  return {
    id: row.id,
    userId: row.user_id,
    objectType: row.object_type,
    title: row.title,
    primaryContent: row.primary_content,
    sourceContext: row.source_context,
    state: row.state,
    metadata: asMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toReflectiveObjectInsertRow(input: CreateReflectiveObjectInput): ReflectiveObjectInsertRow {
  return {
    user_id: input.userId,
    object_type: input.objectType,
    title: input.title,
    primary_content: input.primaryContent,
    source_context: input.sourceContext,
    state: "active",
    metadata: input.metadata ?? {},
  };
}

export function toReflectiveObjectUpdateRow(input: UpdateReflectiveObjectInput): ReflectiveObjectUpdateRow {
  const patch: ReflectiveObjectUpdateRow = {};

  if (typeof input.title === "string") {
    patch.title = input.title;
  }

  if (typeof input.primaryContent === "string") {
    patch.primary_content = input.primaryContent;
  }

  if (typeof input.sourceContext === "string") {
    patch.source_context = input.sourceContext;
  }

  if (typeof input.metadata === "object") {
    patch.metadata = input.metadata;
  }

  return patch;
}
