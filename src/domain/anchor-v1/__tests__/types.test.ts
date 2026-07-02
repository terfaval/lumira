import { describe, expect, it } from "vitest";

import {
  ANCHOR_PARTICIPATION_CONFIDENCES,
  ANCHOR_PARTICIPATION_ROLES,
  ANCHOR_PARTICIPATION_SOURCES,
  ANCHOR_SOURCE_TYPES,
  ANCHOR_TYPES,
} from "@/src/domain/anchor-v1/types";

describe("anchor foundation canon enums", () => {
  it("matches the allowed anchor identity and manifestation enum values", () => {
    expect(ANCHOR_TYPES).toEqual(["ENTITY", "ROLE", "STRUCTURE"]);
    expect(ANCHOR_SOURCE_TYPES).toEqual(["DREAM_DERIVED", "REFLECTIVE_OBJECT_DERIVED"]);
  });

  it("matches the allowed anchor participation enum values", () => {
    expect(ANCHOR_PARTICIPATION_ROLES).toEqual([
      "EVIDENCE",
      "CONTEXT",
      "STRUCTURAL_SUPPORT",
      "SALIENT_LINK",
    ]);
    expect(ANCHOR_PARTICIPATION_CONFIDENCES).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(ANCHOR_PARTICIPATION_SOURCES).toEqual([
      "LLM_CONSTRUCTED",
      "SYSTEM_DERIVED",
      "USER_CONFIRMED",
    ]);
  });
});
