import type { FortuneSessionId, UserId, VersionedTimestamps } from "@/src/shared/types";

export type FortuneSessionState = "active" | "paused" | "completed";

export interface FortuneCardSelection {
  positionKey: string;
  cardId: string;
}

export interface FortuneSession extends VersionedTimestamps {
  id: FortuneSessionId;
  userId: UserId;
  modeId: string;
  focusText: string | null;
  cardSelections: FortuneCardSelection[];
  firstInterpretation: string | null;
  state: FortuneSessionState;
  pausedAt: string | null;
  completedAt: string | null;
  reflectionStartedAt?: string | null;
}

export interface FortuneJournalSessionRecord extends FortuneSession {
  latestTurnAt: string | null;
  latestUserReply: string | null;
}
