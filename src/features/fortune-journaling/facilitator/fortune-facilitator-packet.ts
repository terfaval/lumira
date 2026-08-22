import type { FortuneSession } from "@/src/domain/fortune-sessions/types";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import type { FortuneCard, TarotModeDefinition } from "@/src/content/fortune-journaling";
import type { FortuneFacilitatorPacket } from "@/src/features/fortune-journaling/facilitator/facilitator-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function buildFortuneFacilitatorPacket(input: {
  session: FortuneSession;
  turns: FortuneSessionTurn[];
  mode: TarotModeDefinition;
  deck: FortuneCard[];
}): FortuneFacilitatorPacket {
  assert(input.session.firstInterpretation, "Fortune facilitator requires a first interpretation.");

  return {
    sessionId: input.session.id,
    modeId: input.mode.id,
    modeName: input.mode.name,
    questionProfile: input.mode.question_profile,
    focusText: input.session.focusText,
    firstInterpretation: input.session.firstInterpretation,
    cards: input.session.cardSelections.map((selection) => {
      const position = input.mode.positions.find((entry) => entry.key === selection.positionKey);
      assert(position, `Unknown Fortune position key ${selection.positionKey}.`);

      const card = input.deck.find((entry) => entry.id === selection.cardId);
      assert(card, `Unknown Fortune card id ${selection.cardId}.`);

      return {
        id: card.id,
        name_hu: card.name_hu,
        positionKey: position.key,
        positionLabel: position.label,
      };
    }),
    turns: input.turns.map((turn) => ({
      role: turn.role,
      turnKind: turn.turnKind,
      content: turn.content,
    })),
  };
}
