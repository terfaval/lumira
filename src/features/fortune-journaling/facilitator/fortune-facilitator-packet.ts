import type { FortuneSession } from "@/src/domain/fortune-sessions/types";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import {
  type FortuneCard,
  getTarotQuestionProfileById,
  type TarotModeDefinition,
} from "@/src/content/fortune-journaling";
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
  const questionProfile = getTarotQuestionProfileById(input.mode.question_profile);

  return {
    sessionId: input.session.id,
    mode: {
      id: input.mode.id,
      name: input.mode.name,
      description: input.mode.library.description,
      orientation: input.mode.library.orientation,
      questionProfile: {
        id: questionProfile.id,
        focus: [...questionProfile.focus],
      },
    },
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
        position: {
          key: position.key,
          label: position.label,
        },
        archetype: card.archetype,
        summary: card.summary,
        interpretationAxes: [...card.interpretation_axes],
      };
    }),
    turns: input.turns.map((turn) => ({
      role: turn.role,
      turnKind: turn.turnKind,
      content: turn.content,
    })),
  };
}
