import type { FortuneCard, TarotModeDefinition, TarotModePosition } from "@/src/content/fortune-journaling";
import type { FortuneSession, FortuneSessionState } from "@/src/domain/fortune-sessions/types";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import type { FortuneFacilitatorResponse } from "@/src/features/fortune-journaling/facilitator/facilitator-types";

export interface LocalFortuneSessionCard {
  position: TarotModePosition;
  card: FortuneCard;
  isHintOpen: boolean;
}

export type LocalFortuneActiveStage =
  | "spread"
  | "interpretation"
  | "ready-for-next-round"
  | "awaiting-reply"
  | "awaiting-resting-choice";

export interface LocalFortuneSessionBase {
  sessionId: string | null;
  mode: TarotModeDefinition;
  focus: string | null;
  cards: LocalFortuneSessionCard[];
  interpretation: string | null;
  latestAssistantTurn: FortuneFacilitatorResponse | null;
  reflectiveReply: string | null;
  turns: FortuneSessionTurn[];
  startedAt: string;
}

export interface LocalFortuneSession extends LocalFortuneSessionBase {
  stage: LocalFortuneActiveStage | "paused";
  pausedSubstage?: LocalFortuneActiveStage;
  pausedAt: string | null;
}

export interface LocalFortuneCompletedSession extends LocalFortuneSessionBase {
  stage: "complete";
  interpretation: string;
  completedAt: string;
  pausedAt: null;
}

export interface InterpretationDraft {
  value: string;
}

interface StartLocalFortuneSessionInput {
  deck: FortuneCard[];
  mode: TarotModeDefinition;
  focus: string | null;
  random?: () => number;
  now?: () => string;
}

function normalizeOptionalText(value: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function drawUniqueCards(deck: FortuneCard[], count: number, random: () => number): FortuneCard[] {
  if (deck.length < count) {
    throw new Error("The Fortune deck does not contain enough cards for this mode.");
  }

  const remainingDeck = [...deck];
  const drawnCards: FortuneCard[] = [];

  while (drawnCards.length < count) {
    const randomIndex = Math.floor(random() * remainingDeck.length);
    const safeIndex = Math.max(0, Math.min(randomIndex, remainingDeck.length - 1));
    const [card] = remainingDeck.splice(safeIndex, 1);

    if (!card) {
      throw new Error("Failed to draw a Fortune card.");
    }

    drawnCards.push(card);
  }

  return drawnCards;
}

function assertKnownCardIds(deck: FortuneCard[], selectedCardIds: string[]) {
  const knownIds = new Set(deck.map((card) => card.id));

  for (const cardId of selectedCardIds) {
    if (!knownIds.has(cardId)) {
      throw new Error(`Unknown Fortune card id ${cardId}.`);
    }
  }
}

function parseAssistantTurnContent(content: string): FortuneFacilitatorResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The persisted Fortune assistant turn could not be parsed.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("The persisted Fortune assistant turn is invalid.");
  }

  const record = parsed as Record<string, unknown>;
  const reflection = typeof record.reflection === "string" ? record.reflection.trim() : "";
  if (!reflection) {
    throw new Error("The persisted Fortune assistant turn is incomplete.");
  }

  const mode = record.mode;
  if (mode === "resting_point") {
    if (record.question !== null) {
      throw new Error("The persisted Fortune assistant turn is incomplete.");
    }

    return {
      mode: "resting_point",
      reflection,
      question: null,
    };
  }

  const question = typeof record.question === "string" ? record.question.trim() : "";
  if (!question) {
    throw new Error("The persisted Fortune assistant turn is incomplete.");
  }

  return {
    mode: "question",
    reflection,
    question,
  };
}

function deriveActiveStage(input: {
  cards: LocalFortuneSessionCard[];
  interpretation: string | null;
  latestAssistantTurn: FortuneFacilitatorResponse | null;
  reflectiveReply: string | null;
}): LocalFortuneActiveStage {
  if (!input.interpretation && input.cards.length > 0 && !input.latestAssistantTurn) {
    return "spread";
  }

  if (!input.interpretation) {
    return "interpretation";
  }

  if (!input.latestAssistantTurn) {
    return "ready-for-next-round";
  }

  if (input.reflectiveReply) {
    return "ready-for-next-round";
  }

  return input.latestAssistantTurn.mode === "resting_point" ? "awaiting-resting-choice" : "awaiting-reply";
}

function findLatestAssistantTurn(turns: FortuneSessionTurn[]): FortuneSessionTurn | null {
  const assistantTurns = turns.filter((turn) => turn.role === "assistant" && turn.turnKind === "reflective_prompt");
  return assistantTurns.at(-1) ?? null;
}

function findReplyForRound(turns: FortuneSessionTurn[], roundIndex: number): FortuneSessionTurn | null {
  return (
    turns
      .filter((turn) => turn.role === "user" && turn.turnKind === "reflective_reply" && turn.roundIndex === roundIndex)
      .at(-1) ?? null
  );
}

export function createFortuneCardSelections(input: {
  deck: FortuneCard[];
  mode: TarotModeDefinition;
  random?: () => number;
}): Array<{ positionKey: string; cardId: string }> {
  const drawnCards = drawUniqueCards(input.deck, input.mode.card_count, input.random ?? Math.random);

  return input.mode.positions.map((position, index) => ({
    positionKey: position.key,
    cardId: drawnCards[index]!.id,
  }));
}

export function createFortuneCardSelectionsFromSelectedCardIds(input: {
  deck: FortuneCard[];
  mode: TarotModeDefinition;
  selectedCardIds: string[];
}): Array<{ positionKey: string; cardId: string }> {
  if (input.selectedCardIds.length !== input.mode.card_count) {
    throw new Error("Selected cards must exactly match the authored card count for this mode.");
  }

  if (new Set(input.selectedCardIds).size !== input.selectedCardIds.length) {
    throw new Error("Selected Fortune cards must be unique.");
  }

  assertKnownCardIds(input.deck, input.selectedCardIds);

  return input.mode.positions.map((position, index) => ({
    positionKey: position.key,
    cardId: input.selectedCardIds[index]!,
  }));
}

export function startLocalFortuneSession(input: StartLocalFortuneSessionInput): LocalFortuneSession {
  const cardSelections = createFortuneCardSelections({
    deck: input.deck,
    mode: input.mode,
    random: input.random,
  });

  return {
    sessionId: null,
    mode: input.mode,
    focus: normalizeOptionalText(input.focus),
    cards: input.mode.positions.map((position) => ({
      position,
      card: input.deck.find((entry) => entry.id === cardSelections.find((selection) => selection.positionKey === position.key)?.cardId)!,
      isHintOpen: false,
    })),
    stage: "interpretation",
    interpretation: null,
    latestAssistantTurn: null,
    reflectiveReply: null,
    turns: [],
    startedAt: (input.now ?? (() => new Date().toISOString()))(),
    pausedAt: null,
  };
}

export function hydrateLocalFortuneSession(input: {
  persistedSession: FortuneSession;
  persistedTurns: FortuneSessionTurn[];
  deck: FortuneCard[];
  mode: TarotModeDefinition;
}): LocalFortuneSession | LocalFortuneCompletedSession {
  if (input.persistedSession.modeId !== input.mode.id) {
    throw new Error("The persisted Fortune session mode does not match the current Fortune route.");
  }

  if (input.persistedSession.cardSelections.length !== input.mode.card_count) {
    throw new Error("The persisted Fortune session does not match the authored card count.");
  }

  const cards = input.persistedSession.cardSelections.map((selection) => {
    const position = input.mode.positions.find((entry) => entry.key === selection.positionKey);
    if (!position) {
      throw new Error(`Unknown Fortune position key ${selection.positionKey}.`);
    }

    const card = input.deck.find((entry) => entry.id === selection.cardId);
    if (!card) {
      throw new Error(`Unknown Fortune card id ${selection.cardId}.`);
    }

    return {
      position,
      card,
      isHintOpen: false,
    };
  });

  const sortedTurns = [...input.persistedTurns].sort((left, right) => {
    if (left.roundIndex !== right.roundIndex) {
      return left.roundIndex - right.roundIndex;
    }

    if (left.role !== right.role) {
      return left.role === "assistant" ? -1 : 1;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });

  const latestAssistantTurnRow = findLatestAssistantTurn(sortedTurns);
  const latestAssistantTurn = latestAssistantTurnRow ? parseAssistantTurnContent(latestAssistantTurnRow.content) : null;
  const reflectiveReply = latestAssistantTurnRow ? findReplyForRound(sortedTurns, latestAssistantTurnRow.roundIndex)?.content ?? null : null;
  const interpretation = input.persistedSession.firstInterpretation;

  const base = {
    sessionId: input.persistedSession.id,
    mode: input.mode,
    focus: input.persistedSession.focusText,
    cards,
    interpretation,
    latestAssistantTurn,
    reflectiveReply,
    turns: sortedTurns,
    startedAt: input.persistedSession.createdAt,
  } satisfies LocalFortuneSessionBase;

  if (input.persistedSession.state === "completed") {
    if (!interpretation) {
      throw new Error("Completed Fortune sessions must preserve the first interpretation.");
    }

    return {
      ...base,
      stage: "complete",
      interpretation,
      completedAt: input.persistedSession.completedAt ?? input.persistedSession.updatedAt,
      pausedAt: null,
    };
  }

  const activeStage = deriveActiveStage({
    cards,
    interpretation,
    latestAssistantTurn,
    reflectiveReply,
  });

  if (input.persistedSession.state === "paused") {
    return {
      ...base,
      stage: "paused",
      pausedSubstage: activeStage,
      pausedAt: input.persistedSession.pausedAt,
    };
  }

  return {
    ...base,
    stage: activeStage,
    pausedAt: null,
  };
}

export function toggleCardHint(
  session: LocalFortuneSession | LocalFortuneCompletedSession,
  cardId: string,
): LocalFortuneSession | LocalFortuneCompletedSession {
  return {
    ...session,
    cards: session.cards.map((entry) =>
      entry.card.id === cardId ? { ...entry, isHintOpen: !entry.isHintOpen } : entry,
    ),
  };
}

export function createInterpretationDraft(value: string): InterpretationDraft {
  return { value: value.trim() };
}

export function completeLocalSession(session: LocalFortuneSession, draft: InterpretationDraft): LocalFortuneSession {
  if (!draft.value) {
    throw new Error("The first interpretation is required.");
  }

  return {
    ...session,
    stage: "ready-for-next-round",
    interpretation: draft.value,
  };
}

export function createPersistedFortuneSessionSnapshot(
  session: LocalFortuneSession | LocalFortuneCompletedSession,
  modeId: string,
): FortuneSession {
  const state: FortuneSessionState =
    session.stage === "complete" ? "completed" : session.stage === "paused" ? "paused" : "active";

  return {
    id: session.sessionId ?? "",
    userId: "",
    modeId,
    focusText: session.focus,
    cardSelections: session.cards.map((entry) => ({
      positionKey: entry.position.key,
      cardId: entry.card.id,
    })),
    firstInterpretation: session.interpretation,
    state,
    pausedAt: session.stage === "paused" ? session.pausedAt : null,
    completedAt: session.stage === "complete" ? session.completedAt : null,
    createdAt: session.startedAt,
    updatedAt: new Date().toISOString(),
  };
}
