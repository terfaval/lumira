import type { CreateFortuneSessionTurnInput } from "@/src/domain/fortune-sessions/contracts";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";

export interface FortuneSessionTurnRow {
  id: string;
  session_id: string;
  user_id: string;
  round_index: number;
  role: "assistant" | "user";
  turn_kind: "reflective_prompt" | "reflective_reply";
  content: string;
  created_at: string;
}

export interface FortuneSessionTurnInsertRow {
  session_id: string;
  user_id: string;
  round_index: number;
  role: "assistant" | "user";
  turn_kind: "reflective_prompt" | "reflective_reply";
  content: string;
}

export function toFortuneSessionTurnInsertRow(input: CreateFortuneSessionTurnInput): FortuneSessionTurnInsertRow {
  return {
    session_id: input.sessionId,
    user_id: input.userId,
    round_index: input.roundIndex,
    role: input.role,
    turn_kind: input.turnKind,
    content: input.content,
  };
}

export function fromFortuneSessionTurnRow(row: FortuneSessionTurnRow): FortuneSessionTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    roundIndex: row.round_index,
    role: row.role,
    turnKind: row.turn_kind,
    content: row.content,
    createdAt: row.created_at,
  };
}
