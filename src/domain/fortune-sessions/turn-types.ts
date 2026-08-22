import type { FortuneSessionId, UserId } from "@/src/shared/types";

export type FortuneSessionTurnRole = "assistant" | "user";
export type FortuneSessionTurnKind = "reflective_prompt" | "reflective_reply";

export interface FortuneSessionTurn {
  id: string;
  sessionId: FortuneSessionId;
  userId: UserId;
  roundIndex: number;
  role: FortuneSessionTurnRole;
  turnKind: FortuneSessionTurnKind;
  content: string;
  createdAt: string;
}
