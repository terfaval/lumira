import type {
  CreateReflectiveObjectInput,
  ReflectiveObjectMetadata,
  ReflectiveObjectType,
  UpdateReflectiveObjectInput,
} from "@/src/domain/reflective-objects/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const ALLOWED_OBJECT_TYPES: ReflectiveObjectType[] = ["dream", "journal_entry", "memory", "reflective_note"];

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function parseMetadata(input: unknown): ReflectiveObjectMetadata {
  const record = asRecord(input);

  if (!record) {
    return {};
  }

  const metadata: ReflectiveObjectMetadata = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      metadata[key] = value;
    }
  }

  return metadata;
}

function parseObjectType(input: unknown): ReflectiveObjectType | null {
  if (typeof input !== "string") {
    return null;
  }

  return ALLOWED_OBJECT_TYPES.includes(input as ReflectiveObjectType) ? (input as ReflectiveObjectType) : null;
}

export function parseCreateReflectiveObjectInput(payload: unknown, userId: UserId): ParseResult<CreateReflectiveObjectInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const objectType = parseObjectType(record.objectType);
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const primaryContent = typeof record.primaryContent === "string" ? record.primaryContent.trim() : "";
  const sourceContext = record.sourceContext;

  if (!objectType) {
    return { ok: false, error: "Unsupported reflective object type." };
  }

  if (!title) {
    return { ok: false, error: "title is required." };
  }

  if (!primaryContent) {
    return { ok: false, error: "primaryContent is required." };
  }

  if (sourceContext !== "manual" && sourceContext !== "imported" && sourceContext !== "runtime-generated") {
    return { ok: false, error: "sourceContext must be manual, imported, or runtime-generated." };
  }

  return {
    ok: true,
    value: {
      userId,
      objectType,
      title,
      primaryContent,
      sourceContext,
      metadata: parseMetadata(record.metadata),
    },
  };
}

export function parseUpdateReflectiveObjectInput(
  reflectiveObjectId: ReflectiveObjectId,
  userId: UserId,
  payload: unknown,
): ParseResult<UpdateReflectiveObjectInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const update: UpdateReflectiveObjectInput = {
    id: reflectiveObjectId,
    userId,
  };

  if (typeof record.title === "string") {
    update.title = record.title.trim();
  }

  if (typeof record.primaryContent === "string") {
    update.primaryContent = record.primaryContent.trim();
  }

  if (
    record.sourceContext === "manual" ||
    record.sourceContext === "imported" ||
    record.sourceContext === "runtime-generated"
  ) {
    update.sourceContext = record.sourceContext;
  }

  if (record.metadata !== undefined) {
    update.metadata = parseMetadata(record.metadata);
  }

  const hasChanges =
    update.title !== undefined ||
    update.primaryContent !== undefined ||
    update.sourceContext !== undefined ||
    update.metadata !== undefined;

  if (!hasChanges) {
    return { ok: false, error: "At least one updatable field is required." };
  }

  return { ok: true, value: update };
}
