import type {
  CompleteFortuneSessionInput,
  CreateFortuneSessionInput,
  FortuneSessionRepository,
  PauseFortuneSessionInput,
  ResumeFortuneSessionInput,
  StoreFirstFortuneInterpretationInput,
  UpdateFortuneSessionFocusInput,
} from "@/src/domain/fortune-sessions/contracts";
import type { FortuneSession } from "@/src/domain/fortune-sessions/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromFortuneSessionRow,
  toFortuneSessionInsertRow,
  type FortuneSessionRow,
} from "@/src/infrastructure/supabase/adapters/fortune-session-row";
import type { FortuneSessionId, UserId } from "@/src/shared/types";

const FORTUNE_SESSIONS_TABLE = "fortune_sessions";

export class SupabaseFortuneSessionRepository implements FortuneSessionRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createSession(input: CreateFortuneSessionInput): Promise<FortuneSession> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .insert(toFortuneSessionInsertRow(input))
      .select("*")
      .single<FortuneSessionRow>();

    if (error) {
      throw new Error(`Failed to create Fortune session: ${error.message}`);
    }

    return fromFortuneSessionRow(data);
  }

  async getSessionById(sessionId: FortuneSessionId, userId: UserId): Promise<FortuneSession | null> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle<FortuneSessionRow>();

    if (error) {
      throw new Error(`Failed to load Fortune session: ${error.message}`);
    }

    return data ? fromFortuneSessionRow(data) : null;
  }

  async updateSessionFocus(input: UpdateFortuneSessionFocusInput): Promise<FortuneSession | null> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .update({ focus_text: input.focusText })
      .eq("id", input.sessionId)
      .eq("user_id", input.userId)
      .select("*")
      .maybeSingle<FortuneSessionRow>();

    if (error) {
      throw new Error(`Failed to update Fortune session focus: ${error.message}`);
    }

    return data ? fromFortuneSessionRow(data) : null;
  }

  async storeFirstInterpretation(input: StoreFirstFortuneInterpretationInput): Promise<FortuneSession | null> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .update({
        first_interpretation: input.firstInterpretation,
      })
      .eq("id", input.sessionId)
      .eq("user_id", input.userId)
      .select("*")
      .maybeSingle<FortuneSessionRow>();

    if (error) {
      throw new Error(`Failed to store Fortune first interpretation: ${error.message}`);
    }

    return data ? fromFortuneSessionRow(data) : null;
  }

  async pauseSession(input: PauseFortuneSessionInput): Promise<FortuneSession | null> {
    return this.updateState(input.sessionId, input.userId, {
      state: "paused",
      paused_at: new Date().toISOString(),
      completed_at: null,
    });
  }

  async resumeSession(input: ResumeFortuneSessionInput): Promise<FortuneSession | null> {
    return this.updateState(input.sessionId, input.userId, {
      state: "active",
      paused_at: null,
    });
  }

  async markCompleted(input: CompleteFortuneSessionInput): Promise<FortuneSession | null> {
    return this.updateState(input.sessionId, input.userId, {
      state: "completed",
      paused_at: null,
      completed_at: new Date().toISOString(),
    });
  }

  private async updateState(
    sessionId: string,
    userId: string,
    changes: Partial<FortuneSessionRow>,
  ): Promise<FortuneSession | null> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .update(changes)
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle<FortuneSessionRow>();

    if (error) {
      throw new Error(`Failed to update Fortune session state: ${error.message}`);
    }

    return data ? fromFortuneSessionRow(data) : null;
  }
}
