import type { CreateFortuneSessionInput } from "@/src/domain/fortune-sessions/contracts";
import type { FortuneCardSelection, FortuneSession, FortuneSessionState } from "@/src/domain/fortune-sessions/types";

export interface FortuneSessionRow {
  id: string;
  user_id: string;
  mode_id: string;
  focus_text: string | null;
  card_selections: FortuneCardSelection[];
  first_interpretation: string | null;
  state: FortuneSessionState;
  paused_at: string | null;
  completed_at: string | null;
  reflection_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FortuneSessionInsertRow {
  user_id: string;
  mode_id: string;
  focus_text: string | null;
  card_selections: FortuneCardSelection[];
  first_interpretation: string | null;
  state: FortuneSessionState;
  paused_at: string | null;
  completed_at: string | null;
  reflection_started_at: string | null;
}

export function toFortuneSessionInsertRow(input: CreateFortuneSessionInput): FortuneSessionInsertRow {
  return {
    user_id: input.userId,
    mode_id: input.modeId,
    focus_text: input.focusText,
    card_selections: input.cardSelections,
    first_interpretation: null,
    state: "active",
    paused_at: null,
    completed_at: null,
    reflection_started_at: null,
  };
}

export function fromFortuneSessionRow(row: FortuneSessionRow): FortuneSession {
  return {
    id: row.id,
    userId: row.user_id,
    modeId: row.mode_id,
    focusText: row.focus_text,
    cardSelections: row.card_selections ?? [],
    firstInterpretation: row.first_interpretation,
    state: row.state,
    pausedAt: row.paused_at,
    completedAt: row.completed_at,
    reflectionStartedAt: row.reflection_started_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
