import type { FortuneCard, TarotModeDefinition } from "@/src/content/fortune-journaling";
import type { FortuneJournalSessionRecord, FortuneSessionState } from "@/src/domain/fortune-sessions/types";

export type FortuneJournalSort = "latest" | "oldest";
export type FortuneJournalStatusFilter = FortuneSessionState;

export interface FortuneJournalEntry {
  sessionId: string;
  modeId: string;
  modeName: string;
  cardCount: number;
  cards: FortuneCard[];
  preview: string;
  status: FortuneSessionState;
  lastActivityAt: string;
  lastActivityLabel: string;
  reflectionStartedAt: string;
}

function normalizePreviewText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatHungarianDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}.${month}.${day}.`;
}

function deriveLastActivityAt(session: FortuneJournalSessionRecord): string {
  return session.latestTurnAt ?? session.updatedAt ?? session.createdAt;
}

function derivePreview(session: FortuneJournalSessionRecord): string {
  return (
    normalizePreviewText(session.focusText) ??
    normalizePreviewText(session.firstInterpretation) ??
    normalizePreviewText(session.latestUserReply) ??
    "Nincs megadott fókusz."
  );
}

export function buildFortuneJournalEntries(input: {
  sessions: FortuneJournalSessionRecord[];
  modes: TarotModeDefinition[];
  deck: FortuneCard[];
  sort: FortuneJournalSort;
  modeFilter: string | null;
  statusFilter: FortuneJournalStatusFilter | null;
}): FortuneJournalEntry[] {
  const modeById = new Map(input.modes.map((mode) => [mode.id, mode] as const));
  const cardById = new Map(input.deck.map((card) => [card.id, card] as const));

  const entries = input.sessions.flatMap((session) => {
    const reflectionStartedAt = session.reflectionStartedAt ?? null;
    if (!reflectionStartedAt) {
      return [];
    }

    const mode = modeById.get(session.modeId);
    if (!mode) {
      return [];
    }

    if (input.modeFilter && session.modeId !== input.modeFilter) {
      return [];
    }

    if (input.statusFilter && session.state !== input.statusFilter) {
      return [];
    }

    const cards = mode.positions.flatMap((position) => {
      const selection = session.cardSelections.find((entry) => entry.positionKey === position.key);
      const card = selection ? cardById.get(selection.cardId) : null;
      return card ? [card] : [];
    });

    if (cards.length !== mode.card_count) {
      return [];
    }

    const lastActivityAt = deriveLastActivityAt(session);

    return [
      {
        sessionId: session.id,
        modeId: session.modeId,
        modeName: mode.name,
        cardCount: mode.card_count,
        cards,
        preview: derivePreview(session),
        status: session.state,
        lastActivityAt,
        lastActivityLabel: formatHungarianDate(lastActivityAt),
        reflectionStartedAt,
      },
    ];
  });

  return entries.sort((left, right) => {
    const comparison = left.lastActivityAt.localeCompare(right.lastActivityAt);
    return input.sort === "oldest" ? comparison : comparison * -1;
  });
}
