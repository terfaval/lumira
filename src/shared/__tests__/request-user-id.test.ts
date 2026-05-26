import { describe, expect, it } from "vitest";

import { resolveUserIdFromHeaders } from "@/src/shared/request-user-id";

describe("resolveUserIdFromHeaders", () => {
  it("returns user id from x-lumira-user-id header", () => {
    const headers = new Headers({ "x-lumira-user-id": "user-123" });

    expect(resolveUserIdFromHeaders(headers)).toBe("user-123");
  });

  it("returns null when header is missing", () => {
    expect(resolveUserIdFromHeaders(new Headers())).toBeNull();
  });

  it("returns null when header is blank", () => {
    const headers = new Headers({ "x-lumira-user-id": "   " });

    expect(resolveUserIdFromHeaders(headers)).toBeNull();
  });
});
