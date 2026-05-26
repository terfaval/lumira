import type { UserId } from "@/src/shared/types";

export const LUMIRA_USER_ID_HEADER = "x-lumira-user-id";

export function resolveUserIdFromHeaders(input: Headers): UserId | null {
  const raw = input.get(LUMIRA_USER_ID_HEADER);

  if (!raw) {
    return null;
  }

  const normalized = raw.trim();

  return normalized.length > 0 ? normalized : null;
}
