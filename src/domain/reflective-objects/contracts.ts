import type {
  CreateReflectiveObjectInput,
  ReflectiveObject,
  UpdateReflectiveObjectInput,
} from "@/src/domain/reflective-objects/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export interface ReflectiveObjectRepository {
  create(input: CreateReflectiveObjectInput): Promise<ReflectiveObject>;
  getById(id: ReflectiveObjectId, userId: UserId): Promise<ReflectiveObject | null>;
  listByUser(userId: UserId, limit?: number): Promise<ReflectiveObject[]>;
  update(input: UpdateReflectiveObjectInput): Promise<ReflectiveObject | null>;
  archive(id: ReflectiveObjectId, userId: UserId): Promise<ReflectiveObject | null>;
}
