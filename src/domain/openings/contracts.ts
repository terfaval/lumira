import type {
  CreateOpeningInput,
  Opening,
  OpeningActivationInput,
  OpeningReactivationInput,
  OpeningSuppressionInput,
  OpeningSurface,
  OpeningSurfaceEvent,
} from "@/src/domain/openings/types";
import type { LatentSnapshotId, OpeningId, UserId } from "@/src/shared/types";

export interface OpeningRepository {
  createOpening(input: CreateOpeningInput): Promise<Opening>;
  getOpeningById(openingId: OpeningId, userId: UserId): Promise<Opening | null>;
  getOpeningByIdIncludingArchived?: (openingId: OpeningId, userId: UserId) => Promise<Opening | null>;
  listOpeningSurfacesByUser(userId: UserId, limit?: number): Promise<OpeningSurface[]>;
  listDormantSuppressedOpeningsByUser(userId: UserId): Promise<Opening[]>;
  listRecentOpeningsByUser(userId: UserId, limit?: number): Promise<Opening[]>;
  listOpeningsByLatentSnapshot(snapshotId: LatentSnapshotId, userId: UserId): Promise<Opening[]>;
  activateOpening(input: OpeningActivationInput): Promise<Opening | null>;
  reactivateOpening(input: OpeningReactivationInput): Promise<Opening | null>;
  dismissOpening(openingId: OpeningId, userId: UserId): Promise<Opening | null>;
  setSuppression(input: OpeningSuppressionInput): Promise<Opening | null>;
  recordSurfaceEvent(event: Omit<OpeningSurfaceEvent, "id" | "createdAt" | "updatedAt">): Promise<OpeningSurfaceEvent>;
}
