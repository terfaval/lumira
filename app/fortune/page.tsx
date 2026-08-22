import { getMajorArcanaDeck, getTarotModeById, getTarotModes } from "@/src/content/fortune-journaling";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import { createFortuneSessionRepository } from "@/src/infrastructure/supabase/repositories/create-fortune-session-repository";
import { createFortuneSessionTurnRepository } from "@/src/infrastructure/supabase/repositories/create-fortune-session-turn-repository";
import FortuneJournalingPageClient from "@/src/features/fortune-journaling/FortuneJournalingPageClient";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

export const metadata = {
  title: "Fortune Journaling",
  description: "Tarot-alapu onreflexios ter a nappali Lumira gyakorlatokhoz.",
};

export const dynamic = "force-dynamic";

interface FortunePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FortunePage({ searchParams }: FortunePageProps) {
  const userId = await requireAuthenticatedUserId();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSession = resolvedSearchParams.session;
  const sessionId = Array.isArray(rawSession) ? rawSession[0] ?? null : rawSession ?? null;
  const repository = createFortuneSessionRepository();
  const turnRepository = createFortuneSessionTurnRepository();
  const modes = getTarotModes();
  let initialSession = null;
  let initialTurns: FortuneSessionTurn[] = [];
  let recoveryError: string | null = null;
  let initialMode = null;

  if (typeof sessionId === "string" && sessionId.trim().length > 0) {
    initialSession = await repository.getSessionById(sessionId.trim(), userId);
    if (!initialSession) {
      recoveryError = "A kért Fortune session nem található, vagy már nem érhető el.";
    } else {
      try {
        initialMode = getTarotModeById(initialSession.modeId);
        initialTurns = await turnRepository.listTurnsBySession(sessionId.trim(), userId);
      } catch {
        recoveryError = "A Fortune session mentett módja már nem tölthető vissza biztonságosan.";
        initialSession = null;
        initialTurns = [];
      }
    }
  }

  return (
    <FortuneJournalingPageClient
      deck={getMajorArcanaDeck()}
      modes={modes}
      initialMode={initialMode}
      initialSession={initialSession}
      initialTurns={initialTurns}
      recoveryError={recoveryError}
    />
  );
}
