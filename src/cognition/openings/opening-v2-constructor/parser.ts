import type { OpeningV2ConstructorOutputPacket } from "@/src/cognition/openings/opening-v2-constructor/types";

export function parseOpeningV2ConstructorOutput(raw: unknown): OpeningV2ConstructorOutputPacket | null {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as OpeningV2ConstructorOutputPacket;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object" && raw !== null) {
    return raw as OpeningV2ConstructorOutputPacket;
  }

  return null;
}
