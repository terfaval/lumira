import type { FortuneSessionTurnKind, FortuneSessionTurnRole } from "@/src/domain/fortune-sessions/turn-types";

export interface FortuneFacilitatorPacketTurn {
  role: FortuneSessionTurnRole;
  turnKind: FortuneSessionTurnKind;
  content: string;
}

export interface FortuneFacilitatorPacketCard {
  id: string;
  name_hu: string;
  positionKey: string;
  positionLabel: string;
}

export interface FortuneFacilitatorPacket {
  sessionId: string;
  modeId: string;
  modeName: string;
  questionProfile: string;
  focusText: string | null;
  firstInterpretation: string;
  cards: FortuneFacilitatorPacketCard[];
  turns: FortuneFacilitatorPacketTurn[];
}

export type FortuneFacilitatorResponse =
  | {
      mode: "question";
      reflection: string;
      question: string;
    }
  | {
      mode: "resting_point";
      reflection: string;
      question: null;
    };
