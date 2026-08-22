import type { CreateFortuneSessionTurnInput, FortuneSessionTurnRepository } from "@/src/domain/fortune-sessions/contracts";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromFortuneSessionTurnRow,
  toFortuneSessionTurnInsertRow,
  type FortuneSessionTurnRow,
} from "@/src/infrastructure/supabase/adapters/fortune-session-turn-row";
import type { FortuneSessionId, UserId } from "@/src/shared/types";

const FORTUNE_SESSION_TURNS_TABLE = "fortune_session_turns";

function isSupabaseUniqueConstraintError(error: unknown): error is { code: string; message: string } {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown };
  return candidate.code === "23505";
}

export class SupabaseFortuneSessionTurnRepository implements FortuneSessionTurnRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createTurn(input: CreateFortuneSessionTurnInput): Promise<FortuneSessionTurn> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSION_TURNS_TABLE)
      .insert(toFortuneSessionTurnInsertRow(input))
      .select("*")
      .single<FortuneSessionTurnRow>();

    if (error) {
      throw error;
    }

    return fromFortuneSessionTurnRow(data);
  }

  async listTurnsBySession(sessionId: FortuneSessionId, userId: UserId): Promise<FortuneSessionTurn[]> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSION_TURNS_TABLE)
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("round_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list Fortune session turns: ${error.message}`);
    }

    return (data ?? []).map((row) => fromFortuneSessionTurnRow(row as FortuneSessionTurnRow));
  }

  async getAssistantPromptTurn(
    sessionId: FortuneSessionId,
    userId: UserId,
    roundIndex?: number,
  ): Promise<FortuneSessionTurn | null> {
    return this.getSingleTurnByKind(sessionId, userId, "assistant", "reflective_prompt", roundIndex);
  }

  async getReflectiveReplyTurn(
    sessionId: FortuneSessionId,
    userId: UserId,
    roundIndex?: number,
  ): Promise<FortuneSessionTurn | null> {
    return this.getSingleTurnByKind(sessionId, userId, "user", "reflective_reply", roundIndex);
  }

  async getLatestUnansweredAssistantTurn(sessionId: FortuneSessionId, userId: UserId): Promise<FortuneSessionTurn | null> {
    const turns = await this.listTurnsBySession(sessionId, userId);
    const replyRounds = new Set(
      turns.filter((turn) => turn.turnKind === "reflective_reply").map((turn) => turn.roundIndex),
    );
    const unansweredAssistantTurns = turns.filter(
      (turn) => turn.turnKind === "reflective_prompt" && !replyRounds.has(turn.roundIndex),
    );

    return unansweredAssistantTurns.at(-1) ?? null;
  }

  async getNextRoundIndex(sessionId: FortuneSessionId, userId: UserId): Promise<number> {
    const turns = await this.listTurnsBySession(sessionId, userId);
    const maxRoundIndex = turns.reduce((max, turn) => Math.max(max, turn.roundIndex), -1);
    return maxRoundIndex + 1;
  }

  async createAssistantPromptTurnOrReadExisting(input: CreateFortuneSessionTurnInput): Promise<FortuneSessionTurn> {
    try {
      return await this.createTurn(input);
    } catch (error) {
      if (!isSupabaseUniqueConstraintError(error)) {
        throw new Error(`Failed to create Fortune assistant turn: ${error instanceof Error ? error.message : "unknown error"}`);
      }

      const existing = await this.getAssistantPromptTurn(input.sessionId, input.userId, input.roundIndex);
      if (!existing) {
        throw new Error("Fortune assistant turn uniqueness conflict occurred without a persisted row.");
      }

      return existing;
    }
  }

  async createReflectiveReplyTurnOrReadExisting(input: CreateFortuneSessionTurnInput): Promise<FortuneSessionTurn> {
    try {
      return await this.createTurn(input);
    } catch (error) {
      if (!isSupabaseUniqueConstraintError(error)) {
        throw new Error(`Failed to create Fortune reflective reply turn: ${error instanceof Error ? error.message : "unknown error"}`);
      }

      const existing = await this.getReflectiveReplyTurn(input.sessionId, input.userId, input.roundIndex);
      if (!existing) {
        throw new Error("Fortune reflective reply uniqueness conflict occurred without a persisted row.");
      }

      return existing;
    }
  }

  private async getSingleTurnByKind(
    sessionId: FortuneSessionId,
    userId: UserId,
    role: "assistant" | "user",
    turnKind: "reflective_prompt" | "reflective_reply",
    roundIndex?: number,
  ): Promise<FortuneSessionTurn | null> {
    let query = this.client
      .from(FORTUNE_SESSION_TURNS_TABLE)
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("role", role)
      .eq("turn_kind", turnKind);

    if (roundIndex !== undefined) {
      query = query.eq("round_index", roundIndex);
    }

    const { data, error } = await query
      .order("round_index", { ascending: true })
      .order("created_at", { ascending: true })
      .maybeSingle<FortuneSessionTurnRow>();

    if (error) {
      throw new Error(`Failed to load Fortune session turn: ${error.message}`);
    }

    return data ? fromFortuneSessionTurnRow(data) : null;
  }
}
