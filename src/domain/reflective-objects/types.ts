import type { ReflectiveObjectId, UserId, VersionedTimestamps } from "@/src/shared/types";

export type ReflectiveObjectType = "dream" | "journal_entry" | "memory" | "reflective_note";

export type ReflectiveObjectState = "active" | "archived";
export type ReflectiveObjectMetadataValue = string | number | boolean | null;
export type ReflectiveObjectMetadata = Record<string, ReflectiveObjectMetadataValue>;

export interface ReflectiveObject extends VersionedTimestamps {
  id: ReflectiveObjectId;
  userId: UserId;
  objectType: ReflectiveObjectType;
  title: string;
  primaryContent: string;
  sourceContext: "manual" | "imported" | "runtime-generated";
  state: ReflectiveObjectState;
  metadata: ReflectiveObjectMetadata;
}

export interface CreateReflectiveObjectInput {
  userId: UserId;
  objectType: ReflectiveObjectType;
  title: string;
  primaryContent: string;
  sourceContext: "manual" | "imported" | "runtime-generated";
  metadata?: ReflectiveObjectMetadata;
}

export interface UpdateReflectiveObjectInput {
  id: ReflectiveObjectId;
  userId: UserId;
  title?: string;
  primaryContent?: string;
  sourceContext?: "manual" | "imported" | "runtime-generated";
  metadata?: ReflectiveObjectMetadata;
}
