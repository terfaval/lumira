import type { OpeningSurface } from "@/src/domain/openings/types";
import type { OpeningDialogue } from "@/src/reflective-space/composition/derive-opening-dialogues";

const MAX_DIALOGUE_WINDOW_LIMIT = 20;

export interface DialogueWindowState {
  mode: "bounded_archive_window";
  section: "dialogues";
  scope: "user_reflective_space";
  limit: number;
  returned: number;
  hasMore: boolean;
  nextCursor: string | null;
  nextBeforeCreatedAt: string | null;
  omissionReason: "none" | "section_cap" | "payload_guardrail_trim" | "silence_legitimate";
}

export function toBoundedDialogueLimit(input: number): number {
  if (!Number.isFinite(input) || input < 1) {
    return 8;
  }

  return Math.min(Math.floor(input), MAX_DIALOGUE_WINDOW_LIMIT);
}

export function filterOpeningSurfacesForCalmAvailability(surfaces: OpeningSurface[]): OpeningSurface[] {
  return surfaces.filter((surface) => surface.suppressionState === "none").slice(0, 3);
}

export function isOpeningUtteranceVisible(openingId: string, activatedUtterances: Record<string, string>): boolean {
  return typeof activatedUtterances[openingId] === "string" && activatedUtterances[openingId].trim().length > 0;
}

export function toDialogueTracePhrasing(dialogue: OpeningDialogue): string {
  if (dialogue.lineage.openingResponseContext === "activation_without_response") {
    return "Opened without response; held quietly.";
  }

  return "Response authored and revisitable.";
}

export function toDialogueWindowState(window: Partial<DialogueWindowState> | null | undefined): DialogueWindowState {
  return {
    mode: "bounded_archive_window",
    section: "dialogues",
    scope: "user_reflective_space",
    limit: toBoundedDialogueLimit(window?.limit ?? 8),
    returned: Math.max(0, Math.floor(window?.returned ?? 0)),
    hasMore: Boolean(window?.hasMore),
    nextCursor: window?.nextCursor ?? null,
    nextBeforeCreatedAt: window?.nextBeforeCreatedAt ?? null,
    omissionReason: window?.omissionReason ?? "none",
  };
}

const FORBIDDEN_UI_MARKERS = ["progress", "complete", "streak", "unread", "continue conversation"];

export function containsForbiddenInteractionLanguage(lines: string[]): boolean {
  const normalized = lines.join(" ").toLowerCase();
  return FORBIDDEN_UI_MARKERS.some((marker) => normalized.includes(marker));
}
