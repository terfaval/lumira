import { describe, expect, it } from "vitest";

import { resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";

describe("resolveRequestUserContext", () => {
  it("uses trusted supabase user when available", async () => {
    const result = await resolveRequestUserContext(new Headers(), {
      loadTrustedUserId: async () => "trusted-user",
      nodeEnv: "production",
    });

    expect(result).toEqual({ userId: "trusted-user", source: "supabase_auth" });
  });

  it("allows header fallback in non-production only", async () => {
    const result = await resolveRequestUserContext(new Headers({ "x-lumira-user-id": "dev-user" }), {
      loadTrustedUserId: async () => null,
      nodeEnv: "development",
    });

    expect(result).toEqual({ userId: "dev-user", source: "dev_header_fallback" });
  });

  it("rejects header fallback in production", async () => {
    const result = await resolveRequestUserContext(new Headers({ "x-lumira-user-id": "dev-user" }), {
      loadTrustedUserId: async () => null,
      nodeEnv: "production",
    });

    expect(result).toEqual({ userId: null, source: "none" });
  });
});
