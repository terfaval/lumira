import type { Opening } from "@/src/domain/openings/types";

export interface ReflectiveOpeningSurface {
  openingId: string;
  openingType: Opening["openingType"];
  tone: Opening["tone"];
  state: Opening["state"];
  phrasing: string;
  activated: boolean;
}

function toPhrasing(openingType: Opening["openingType"]): string {
  switch (openingType) {
    case "reflective_question":
      return "quiet reflective question available";
    case "continuity_noticing":
      return "continuity noticing is available";
    case "reflective_recall":
      return "a revisitable recall is available";
    case "juxtaposition":
      return "a nearby juxtaposition is available";
    default:
      return "an optional reflective invitation is available";
  }
}

export function deriveOpeningSurfaces(openings: Opening[]): ReflectiveOpeningSurface[] {
  return openings
    .filter((opening) => opening.state !== "archived")
    .filter((opening) => opening.suppressionState === "none")
    .slice(0, 2)
    .map((opening) => ({
      openingId: opening.id,
      openingType: opening.openingType,
      tone: opening.tone,
      state: opening.state,
      phrasing: toPhrasing(opening.openingType),
      activated: opening.state === "activated",
    }));
}
