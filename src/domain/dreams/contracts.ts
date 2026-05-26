import type { DreamObject } from "@/src/domain/dreams/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export interface DreamRepository {
  createDream(input: DreamObject): Promise<DreamObject>;
  getDream(id: ReflectiveObjectId): Promise<DreamObject | null>;
  listDreams(userId: UserId): Promise<DreamObject[]>;
}
