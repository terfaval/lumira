import type { ReflectiveResponse } from "@/src/domain/responses/types";

export interface ReflectiveResponseSurface {
  responseId: string;
  title: string;
  state: "active" | "quiet" | "archived";
  visibility: "foreground" | "ambient" | "hidden";
  phrasing: string;
}

function toPhrasing(state: ReflectiveResponse["state"]): string {
  if (state === "quiet") {
    return "revisitable reflection";
  }

  if (state === "archived") {
    return "held in continuity memory";
  }

  return "personal reflection in continuity";
}

export function deriveResponseSurfaces(responses: ReflectiveResponse[]): ReflectiveResponseSurface[] {
  return responses.map((response) => ({
    responseId: response.id,
    title: response.title,
    state: response.state,
    visibility: response.visibility,
    phrasing: toPhrasing(response.state),
  }));
}
