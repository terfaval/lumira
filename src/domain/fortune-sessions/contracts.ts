import type { FortuneSessionId, UserId } from "@/src/shared/types";

import type { FortuneCardSelection, FortuneSession } from "@/src/domain/fortune-sessions/types";
import type {
  FortuneSessionTurn,
  FortuneSessionTurnKind,
  FortuneSessionTurnRole,
} from "@/src/domain/fortune-sessions/turn-types";

export interface CreateFortuneSessionInput {
  userId: UserId;
  modeId: string;
  focusText: string | null;
  cardSelections: FortuneCardSelection[];
}

export interface UpdateFortuneSessionFocusInput {
  sessionId: FortuneSessionId;
  userId: UserId;
  focusText: string | null;
}

export interface StoreFirstFortuneInterpretationInput {
  sessionId: FortuneSessionId;
  userId: UserId;
  firstInterpretation: string;
}

export interface CompleteFortuneSessionInput {
  sessionId: FortuneSessionId;
  userId: UserId;
}

export interface PauseFortuneSessionInput {
  sessionId: FortuneSessionId;
  userId: UserId;
}

export interface ResumeFortuneSessionInput {
  sessionId: FortuneSessionId;
  userId: UserId;
}

export interface FortuneSessionRepository {
  createSession(input: CreateFortuneSessionInput): Promise<FortuneSession>;
  getSessionById(sessionId: FortuneSessionId, userId: UserId): Promise<FortuneSession | null>;
  updateSessionFocus(input: UpdateFortuneSessionFocusInput): Promise<FortuneSession | null>;
  storeFirstInterpretation(input: StoreFirstFortuneInterpretationInput): Promise<FortuneSession | null>;
  pauseSession(input: PauseFortuneSessionInput): Promise<FortuneSession | null>;
  resumeSession(input: ResumeFortuneSessionInput): Promise<FortuneSession | null>;
  markCompleted(input: CompleteFortuneSessionInput): Promise<FortuneSession | null>;
}

export interface CreateFortuneSessionTurnInput {
  sessionId: FortuneSessionId;
  userId: UserId;
  roundIndex: number;
  role: FortuneSessionTurnRole;
  turnKind: FortuneSessionTurnKind;
  content: string;
}

export interface FortuneSessionTurnRepository {
  createTurn(input: CreateFortuneSessionTurnInput): Promise<FortuneSessionTurn>;
  listTurnsBySession(sessionId: FortuneSessionId, userId: UserId): Promise<FortuneSessionTurn[]>;
  getAssistantPromptTurn(
    sessionId: FortuneSessionId,
    userId: UserId,
    roundIndex?: number,
  ): Promise<FortuneSessionTurn | null>;
  getReflectiveReplyTurn(
    sessionId: FortuneSessionId,
    userId: UserId,
    roundIndex?: number,
  ): Promise<FortuneSessionTurn | null>;
  getLatestUnansweredAssistantTurn(sessionId: FortuneSessionId, userId: UserId): Promise<FortuneSessionTurn | null>;
  getNextRoundIndex(sessionId: FortuneSessionId, userId: UserId): Promise<number>;
  createAssistantPromptTurnOrReadExisting(input: CreateFortuneSessionTurnInput): Promise<FortuneSessionTurn>;
  createReflectiveReplyTurnOrReadExisting(input: CreateFortuneSessionTurnInput): Promise<FortuneSessionTurn>;
}
