import { describe, expect, it } from "vitest";

type SearchCard = { slug: string };

async function loadSearchModule() {
  const mod = await import("../search").catch(() => null);

  expect(mod).not.toBeNull();

  return mod as Record<string, unknown>;
}

function pickSearch(mod: Record<string, unknown>) {
  return mod.searchSleepDreamGuideCards as ((query: string) => SearchCard[]) | undefined;
}

function pickGetBySlug(mod: Record<string, unknown>) {
  return mod.getSleepDreamGuideCardBySlug as ((slug: string) => SearchCard | undefined) | undefined;
}

function pickGetCards(mod: Record<string, unknown>) {
  return mod.getSleepDreamGuideCards as (() => SearchCard[]) | undefined;
}

function pickGetTags(mod: Record<string, unknown>) {
  return mod.getSleepDreamGuideDisplayTags as
    | (() => { primary: string[]; secondary: string[] })
    | undefined;
}

describe("sleep dream guide search", () => {
  it("exports the expected search helpers", async () => {
    const mod = await loadSearchModule();

    expect(typeof pickSearch(mod)).toBe("function");
    expect(typeof pickGetBySlug(mod)).toBe("function");
    expect(typeof pickGetCards(mod)).toBe("function");
    expect(typeof pickGetTags(mod)).toBe("function");
  });

  it("finds nem tudok elaludni from the exact phrase", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();
    expect(search!("nem tudok elaludni")[0]?.slug).toBe("nem-tudok-elaludni");
  });

  it("finds overthinking phrasing from everyday wording", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();
    expect(search!("agyalok este")[0]?.slug).toBe("tul-sokat-gondolkodom-lefekveskor");
  });

  it("finds alvasi benulas from a symptom-heavy query", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();
    expect(search!("felébredtem és nem tudtam mozogni")[0]?.slug).toBe("alvasi-benulas");
  });

  it("finds the deceased-person dream card with accent-tolerant matching", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();
    expect(search!("halottal álmodtam")[0]?.slug).toBe("elhunyt-szemellyel-almodtam");
  });

  it("finds reality check cards from english wording", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();

    const results = search!("reality check").slice(0, 3).map((card) => card.slug);

    expect(results).toContain("reality-check");
    expect(results).toContain("nem-mukodik-a-reality-check");
  });

  it("finds MILD by the acronym", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();
    expect(search!("mild")[0]?.slug).toBe("mild");
  });

  it("finds caffeine-related content from a single keyword", async () => {
    const mod = await loadSearchModule();
    const search = pickSearch(mod);

    expect(search).toBeDefined();
    expect(search!("koffein")[0]?.slug).toBe("etkezes-koffein-alkohol-es-alvas");
  });

  it("returns stable accessor data", async () => {
    const mod = await loadSearchModule();
    const getCards = pickGetCards(mod);
    const getBySlug = pickGetBySlug(mod);
    const getTags = pickGetTags(mod);

    expect(getCards).toBeDefined();
    expect(getBySlug).toBeDefined();
    expect(getTags).toBeDefined();

    const cards = getCards!();
    const fetched = getBySlug!("mild");
    const tags = getTags!();

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((card) => card.slug === "mild")).toBe(true);
    expect(fetched?.slug).toBe("mild");
    expect(tags.primary).toContain("Alvás");
    expect(tags.secondary).toContain("MILD");
  });
});
