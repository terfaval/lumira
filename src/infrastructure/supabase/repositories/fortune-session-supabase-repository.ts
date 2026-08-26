import type {
  CompleteFortuneSessionInput,
  CreateFortuneSessionInput,
  FortuneSessionRepository,
  MarkFortuneReflectionStartedInput,
  PauseFortuneSessionInput,
  ResumeFortuneSessionInput,
  StoreFirstFortuneInterpretationInput,
  UpdateFortuneSessionFocusInput,
} from "@/src/domain/fortune-sessions/contracts";
import type { FortuneJournalSessionRecord, FortuneSession } from "@/src/domain/fortune-sessions/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromFortuneSessionRow,
  toFortuneSessionInsertRow,
  type FortuneSessionRow,
} from "@/src/infrastructure/supabase/adapters/fortune-session-row";
import type { FortuneSessionId, UserId } from "@/src/shared/types";

const FORTUNE_SESSIONS_TABLE = "fortune_sessions";
const FORTUNE_SESSION_TURNS_TABLE = "fortune_session_turns";

interface FortuneJournalTurnSummaryRow {
  session_id: string;
  role: "assistant" | "user";
  turn_kind: "reflective_prompt" | "reflective_reply";
  content: string;
  created_at: string;
}

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

  async markReflectionStarted(input: MarkFortuneReflectionStartedInput): Promise<FortuneSession | null> {
    const existing = await this.getSessionById(input.sessionId, input.userId);
    if (!existing) {
      return null;
    }

    if (existing.reflectionStartedAt) {
      return existing;
    }

    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .update({
        reflection_started_at: new Date().toISOString(),
      })
      .eq("id", input.sessionId)
      .eq("user_id", input.userId)
      .select("*")
      .maybeSingle<FortuneSessionRow>();

    if (error) {
      throw new Error(`Failed to mark Fortune reflection as started: ${error.message}`);
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

  async listStartedSessionsForJournal(userId: UserId): Promise<FortuneJournalSessionRecord[]> {
    const { data, error } = await this.client
      .from(FORTUNE_SESSIONS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .not("reflection_started_at", "is", null)
      .order("reflection_started_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list started Fortune sessions: ${error.message}`);
    }

    const sessions = (data ?? []).map((row) => fromFortuneSessionRow(row as FortuneSessionRow));
    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((session) => session.id);
    const { data: turnData, error: turnError } = await this.client
      .from(FORTUNE_SESSION_TURNS_TABLE)
      .select("session_id, role, turn_kind, content, created_at")
      .eq("user_id", userId)
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    if (turnError) {
      throw new Error(`Failed to list Fortune journal turn summaries: ${turnError.message}`);
    }

    const latestTurnAtBySessionId = new Map<string, string>();
    const latestUserReplyBySessionId = new Map<string, string>();

    for (const row of (turnData ?? []) as FortuneJournalTurnSummaryRow[]) {
      if (!latestTurnAtBySessionId.has(row.session_id)) {
        latestTurnAtBySessionId.set(row.session_id, row.created_at);
      }

      if (row.role !== "user" || row.turn_kind !== "reflective_reply" || latestUserReplyBySessionId.has(row.session_id)) {
        continue;
      }

      const trimmedContent = row.content.trim();
      if (trimmedContent) {
        latestUserReplyBySessionId.set(row.session_id, trimmedContent);
      }
    }

    return sessions.map((session) => ({
      ...session,
      latestTurnAt: latestTurnAtBySessionId.get(session.id) ?? null,
      latestUserReply: latestUserReplyBySessionId.get(session.id) ?? null,
    }));
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
