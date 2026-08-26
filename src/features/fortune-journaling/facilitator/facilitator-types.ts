import type { FortuneSessionTurnKind, FortuneSessionTurnRole } from "@/src/domain/fortune-sessions/turn-types";

export interface FortuneFacilitatorPacketTurn {
  role: FortuneSessionTurnRole;
  turnKind: FortuneSessionTurnKind;
  content: string;
}

export interface FortuneFacilitatorPacketMode {
  id: string;
  name: string;
  description: string;
  orientation: string;
  questionProfile: {
    id: string;
    focus: string[];
  };
}

export interface FortuneFacilitatorPacketCard {
  id: string;
  name_hu: string;
  position: {
    key: string;
    label: string;
  };
  archetype: string;
  summary: string;
  interpretationAxes: string[];
}

export interface FortuneFacilitatorPacket {
  sessionId: string;
  mode: FortuneFacilitatorPacketMode;
  focusText: string | null;
  firstInterpretation: string | null;
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
