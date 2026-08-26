import type { TarotModeDefinition } from "@/src/content/fortune-journaling";

export type FortunePreSessionStage = "focus" | "draw";

export interface FortunePreSessionState {
  mode: TarotModeDefinition;
  stage: FortunePreSessionStage;
  focusDraft: string;
  selectedCardIds: string[];
}

export function normalizeFortuneFocusDraft(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function beginFortunePreSession(mode: TarotModeDefinition): FortunePreSessionState {
  return {
    mode,
    stage: "focus",
    focusDraft: "",
    selectedCardIds: [],
  };
}

export function continueFortunePreSessionToDraw(state: FortunePreSessionState): FortunePreSessionState {
  return {
    ...state,
    stage: "draw",
  };
}

export function skipFortuneFocusStep(state: FortunePreSessionState): FortunePreSessionState {
  return {
    ...state,
    stage: "draw",
    focusDraft: "",
  };
}

export function returnFortuneDrawToFocus(state: FortunePreSessionState): FortunePreSessionState {
  return {
    ...state,
    stage: "focus",
    selectedCardIds: [],
  };
}
