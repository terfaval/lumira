import type {
  ContinuityNeighborhoodAmbiguity,
  ContinuityNeighborhood,
  ContinuityNeighborhoodBounds,
  ContinuityNeighborhoodLookup,
} from "@/src/domain/anchor-v1/continuity-neighborhood";
import type { UserId } from "@/src/shared/types";

export class ContinuityNeighborhoodOperationalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContinuityNeighborhoodOperationalError";
  }
}

export class ContinuityNeighborhoodContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContinuityNeighborhoodContractError";
  }
}

export function hasContinuityNeighborhoodAmbiguity(
  ambiguity: ContinuityNeighborhoodAmbiguity | null | undefined,
): ambiguity is ContinuityNeighborhoodAmbiguity {
  return Boolean(ambiguity);
}

export interface ContinuityNeighborhoodReader {
  readNeighborhood(
    userId: UserId,
    lookup: ContinuityNeighborhoodLookup,
    bounds: ContinuityNeighborhoodBounds,
  ): Promise<ContinuityNeighborhood>;
}
