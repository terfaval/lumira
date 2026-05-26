import type { CreateLatentSnapshotInput, LatentSnapshot } from "@/src/domain/latent/types";
import type { LatentSnapshotId, UserId } from "@/src/shared/types";

export interface LatentRepository {
  createSnapshot(input: CreateLatentSnapshotInput): Promise<LatentSnapshot>;
  getSnapshotById(snapshotId: LatentSnapshotId, userId: UserId): Promise<LatentSnapshot | null>;
  listSnapshotsByUser(userId: UserId): Promise<LatentSnapshot[]>;
  archiveSnapshot(snapshotId: LatentSnapshotId, userId: UserId): Promise<LatentSnapshot | null>;
}
