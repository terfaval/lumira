import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";

export type StartDirectionResult = {
  success: boolean;
  alreadySelected?: boolean;
  nextUrl?: string;
  error?: string;
};

export async function startDirection(
  sessionId: string,
  directionSlug: string,
  source: "frame" | "direction_modal" | "work" | "import" | "system" = "direction_modal"
): Promise<StartDirectionResult> {
  const res = await fetchWithAuth("/api/direction/select", {
    method: "POST",
    json: {
      session_id: sessionId,
      slug: directionSlug,
      source,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { success: false, error: text || "Request failed" };
  }

  const data = (await res.json().catch(() => null)) as
    | { next_url?: string; already_selected?: boolean }
    | null;

  return {
    success: true,
    alreadySelected: data?.already_selected ?? false,
    nextUrl: data?.next_url ?? undefined,
  };
}
