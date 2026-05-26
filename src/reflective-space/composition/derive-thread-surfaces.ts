import type { ReflectiveThread } from "@/src/domain/threads/types";

export interface ReflectiveThreadSurface {
  threadId: string;
  title: string;
  state: "active" | "dormant" | "quiet" | "archived";
  visibility: "foreground" | "ambient" | "hidden";
  phrasing: string;
}

function toPhrasing(state: ReflectiveThread["state"]): string {
  if (state === "dormant") {
    return "revisitable thread";
  }

  if (state === "quiet") {
    return "continuity appears here";
  }

  if (state === "archived") {
    return "held in continuity memory";
  }

  return "connected reflections";
}

export function deriveThreadSurfaces(threads: ReflectiveThread[]): ReflectiveThreadSurface[] {
  return threads.map((thread) => ({
    threadId: thread.id,
    title: thread.title,
    state: thread.state,
    visibility: thread.visibility,
    phrasing: toPhrasing(thread.state),
  }));
}
