import { describe, expect, it } from "vitest";

import {
  parseGlossaryCandidateResolution,
  parseGlossaryCandidateLifecycleUpdate,
  parseGlossaryTermUpdate,
} from "@/src/domain/glossary/http-contract";

describe("glossary http contracts", () => {
  it("parses valid candidate lifecycle updates", () => {
    const parsed = parseGlossaryCandidateLifecycleUpdate(
      {
        nextState: "suppressed",
        displayLabel: "Quiet hallway",
        suppressionReason: "do not resurface right now",
        appearanceNote: "Most nagyon tamogato volt.",
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.nextState).toBe("suppressed");
    expect(parsed.value.userId).toBe("user-1");
    expect(parsed.value.appearanceNote).toBe("Most nagyon tamogato volt.");
  });

  it("rejects invalid candidate lifecycle state", () => {
    const parsed = parseGlossaryCandidateLifecycleUpdate({ nextState: "invalid" }, "cand-1", "user-1");
    expect(parsed.ok).toBe(false);
  });

  it("parses candidate updates with canonical candidate class metadata", () => {
    const parsed = parseGlossaryCandidateLifecycleUpdate(
      {
        nextState: "candidate",
        candidateClass: "match_candidate",
        proposedEntityIds: ["term-1"],
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.candidateClass).toBe("match_candidate");
    expect(parsed.value.proposedEntityIds).toEqual(["term-1"]);
  });

  it("rejects invalid canonical candidate class shapes", () => {
    const parsed = parseGlossaryCandidateLifecycleUpdate(
      {
        nextState: "candidate",
        candidateClass: "ambiguous_match_candidate",
        proposedEntityIds: ["term-1"],
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(false);
  });

  it("parses candidate resolution requests for existing entities", () => {
    const parsed = parseGlossaryCandidateResolution(
      {
        resolutionType: "select_existing_entity",
        entityId: "term-2",
        canonicalLabel: "Apu",
        appearanceNote: "This was definitely the same person.",
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.resolutionType).toBe("select_existing_entity");
    expect(parsed.value.entityId).toBe("term-2");
    expect(parsed.value.canonicalLabel).toBe("Apu");
    expect(parsed.value.appearanceNote).toBe("This was definitely the same person.");
  });

  it("parses candidate resolution requests for new entities with normalized aliases", () => {
    const parsed = parseGlossaryCandidateResolution(
      {
        resolutionType: "create_new_entity",
        canonicalLabel: "Apa",
        type: "person",
        aliases: ["apu", " APU ", "apám"],
        generalNote: "Recurring father figure.",
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.canonicalLabel).toBe("Apa");
    expect(parsed.value.type).toBe("person");
    expect(parsed.value.aliases).toEqual(["apu", "apám"]);
    expect(parsed.value.generalNote).toBe("Recurring father figure.");
  });

  it("rejects existing-entity resolution without an entity id", () => {
    const parsed = parseGlossaryCandidateResolution(
      {
        resolutionType: "confirm_existing_entity",
      },
      "cand-1",
      "user-1",
    );

    expect(parsed.ok).toBe(false);
  });

  it("parses continuity entity updates with normalized aliases", () => {
    const parsed = parseGlossaryTermUpdate(
      {
        canonicalLabel: "Bridge",
        type: "place",
        aliases: ["bridge", " Bridge ", "", "BRIDGE"],
        generalNote: "Recurring crossing point.",
      },
      "term-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.type).toBe("place");
    expect(parsed.value.aliases).toEqual(["bridge"]);
    expect(parsed.value.canonicalLabel).toBe("Bridge");
    expect(parsed.value.generalNote).toBe("Recurring crossing point.");
  });

  it("dedupes aliases using the shared recognition normalizer while preserving display text", () => {
    const parsed = parseGlossaryTermUpdate(
      {
        canonicalLabel: "Kozmo",
        type: "person",
        aliases: ["Kozmó", "kozmo", "(KOZMO)", "Dóri", "dori"],
      },
      "term-1",
      "user-1",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.aliases).toEqual(["Kozmó", "Dóri"]);
  });

  it("rejects unsupported continuity entity types", () => {
    const parsed = parseGlossaryTermUpdate(
      {
        canonicalLabel: "Bridge",
        type: "vehicle",
      },
      "term-1",
      "user-1",
    );

    expect(parsed.ok).toBe(false);
  });

  it("requires non-empty canonical label", () => {
    const parsed = parseGlossaryTermUpdate({ canonicalLabel: "   " }, "term-1", "user-1");
    expect(parsed.ok).toBe(false);
  });
});
