export type FortuneHeaderLeftStage =
  | "library"
  | "draw"
  | "spread"
  | "interpretation"
  | "ready-for-next-round"
  | "awaiting-reply"
  | "awaiting-resting-choice"
  | "paused"
  | "complete";

export function getDrawInstruction(cardCount: number, selectedCount: number): string {
  const remaining = Math.max(cardCount - selectedCount, 0);

  if (selectedCount <= 0) {
    return `Válassz ${cardCount} kártyát`;
  }

  if (remaining === 1) {
    return "Válassz még 1 kártyát";
  }

  return `Válassz még ${remaining} kártyát`;
}

export function toggleDrawCardSelection(input: {
  selectedCardIds: string[];
  cardId: string;
  cardCount: number;
}): {
  selectedCardIds: string[];
  didChange: boolean;
  shouldPersist: boolean;
} {
  const { selectedCardIds, cardId, cardCount } = input;

  if (selectedCardIds.includes(cardId)) {
    return {
      selectedCardIds: selectedCardIds.filter((entry) => entry !== cardId),
      didChange: true,
      shouldPersist: false,
    };
  }

  if (selectedCardIds.length >= cardCount) {
    return {
      selectedCardIds,
      didChange: false,
      shouldPersist: false,
    };
  }

  const nextSelectedCardIds = [...selectedCardIds, cardId];

  return {
    selectedCardIds: nextSelectedCardIds,
    didChange: true,
    shouldPersist: nextSelectedCardIds.length === cardCount,
  };
}

export function getHeaderLeftControl(stage: FortuneHeaderLeftStage): {
  ariaLabel: string;
  target: "home" | "library";
} {
  if (stage === "library") {
    return {
      ariaLabel: "Vissza a kezdőlapra",
      target: "home",
    };
  }

  if (stage === "draw") {
    return {
      ariaLabel: "Vissza",
      target: "library",
    };
  }

  return {
    ariaLabel: "Kilépés a Fortune könyvtárba",
    target: "library",
  };
}
