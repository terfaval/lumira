import type { LatentGenerationRunId, UserId } from "@/src/shared/types";

import type { LatentGenerationRunStatus } from "@/src/domain/latent-v2/types";

export class LatentGenerationRunTransitionConflictError extends Error {
  readonly generationRunId: LatentGenerationRunId;
  readonly userId: UserId;
  readonly expectedStatus: LatentGenerationRunStatus;
  readonly targetStatus: LatentGenerationRunStatus;
  readonly actualStatus: LatentGenerationRunStatus | "missing" | "unknown";

  constructor(input: {
    generationRunId: LatentGenerationRunId;
    userId: UserId;
    expectedStatus: LatentGenerationRunStatus;
    targetStatus: LatentGenerationRunStatus;
    actualStatus?: LatentGenerationRunStatus | "missing" | "unknown";
  }) {
    const actualStatus = input.actualStatus ?? "unknown";
    super(
      `Latent generation run transition conflict: expected ${input.expectedStatus} before ${input.targetStatus}, actual ${actualStatus}.`,
    );
    this.name = "LatentGenerationRunTransitionConflictError";
    this.generationRunId = input.generationRunId;
    this.userId = input.userId;
    this.expectedStatus = input.expectedStatus;
    this.targetStatus = input.targetStatus;
    this.actualStatus = actualStatus;
  }
}

export class LatentGenerationRunRollbackDeletionConflictError extends Error {
  readonly generationRunId: LatentGenerationRunId;
  readonly userId: UserId;
  readonly actualStatus: LatentGenerationRunStatus | "missing" | "unknown";

  constructor(input: {
    generationRunId: LatentGenerationRunId;
    userId: UserId;
    actualStatus?: LatentGenerationRunStatus | "missing" | "unknown";
  }) {
    const actualStatus = input.actualStatus ?? "unknown";
    super(
      `Latent generation run rollback_delete_requires_pending: ${input.generationRunId} is ${actualStatus}.`,
    );
    this.name = "LatentGenerationRunRollbackDeletionConflictError";
    this.generationRunId = input.generationRunId;
    this.userId = input.userId;
    this.actualStatus = actualStatus;
  }
}
