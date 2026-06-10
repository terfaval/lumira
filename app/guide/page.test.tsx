import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("GuidePage", () => {
  it("renders the lightweight guide header and home back link", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Útmutató alváshoz és álmokhoz");
    expect(markup).toContain("Gyakorlati tájékozódás gyakori alvási és álomhelyzetekben.");
    expect(markup).toContain('href="/"');
    expect(markup).toContain('aria-label="Vissza a kezdőlapra"');
    expect(markup).toContain("Keresés a kártyák között");
    expect(markup).toContain("Összes");
    expect(markup).not.toContain("Sleep &amp; Dream Guide");
    expect(markup).not.toContain(">Guide<");
    expect(markup).not.toContain("Kapcsolódó témák");
    expect(markup).not.toContain("Guide space will provide quiet references for sleep and dream practice.");
    expect(markup).not.toContain("Return to home");
  });

  it("opens the requested guide card modal when the card query param matches a slug", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({ card: "remalom" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Rémálom");
    expect(markup).toContain('role="dialog"');
  });

  it("falls back to the normal guide page for an invalid card query param", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default({
      searchParams: Promise.resolve({ card: "not-real" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).not.toContain('role="dialog"');
    expect(markup).toContain("Keresés a kártyák között");
  });
});
