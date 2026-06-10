import { describe, expect, it } from "vitest";

import { buildGuideCardHref, resolveGuideModalSlug } from "@/src/ui/guide/guide-modal-state";

describe("guide modal state", () => {
  it("resolves a valid card slug for initial modal opening", () => {
    expect(resolveGuideModalSlug("remalom")).toBe("remalom");
  });

  it("ignores an invalid card slug", () => {
    expect(resolveGuideModalSlug("not-real")).toBeNull();
    expect(resolveGuideModalSlug(null)).toBeNull();
  });

  it("adds the card query param when opening a guide card", () => {
    expect(buildGuideCardHref("/guide", "", "nem-tudok-elaludni")).toBe("/guide?card=nem-tudok-elaludni");
  });

  it("removes only the card query param when closing a query-opened modal", () => {
    expect(buildGuideCardHref("/guide", "?card=remalom&foo=bar", null)).toBe("/guide?foo=bar");
  });
});
