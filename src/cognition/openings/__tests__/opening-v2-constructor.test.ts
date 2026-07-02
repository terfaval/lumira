import { describe, expect, it } from "vitest";

import {
  buildOpeningV2ConstructorPrompt,
  buildOpeningV2HungarianPolishPrompt,
  composeOpeningV2InputPacket,
  mapValidatedOpeningV2OutputToCreateOpeningInput,
  parseAndValidateOpeningV2ConstructorOutput,
} from "@/src/cognition/openings/opening-v2-constructor";
import type {
  OpeningV2ConstructorInputPacket,
  OpeningV2ConstructorOutputPacket,
} from "@/src/cognition/openings/opening-v2-constructor/types";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";

function createInputPacket(): OpeningV2ConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "opening_v2_constructor_mvp",
      objectLanguage: "hu",
      userId: "user-1",
      reflectiveObjectId: "reflective-object-1",
      sourceOpportunityManifestationId: "manifestation-1",
    },
    opportunity: {
      manifestationId: "manifestation-1",
      summary: "A jatekos telefonos feszultseg kesobb kozos keresesse alakul Boraval.",
      primaryCategory: "transition",
      secondaryCategories: ["relationship", "tension"],
      structure: {
        kind: "A_TO_B_TO_C",
        label: "hiding -> uncertainty -> searching together",
        elements: ["telefon", "Bora", "egyutt kereses"],
        metadata: {
          nodes: [
            { key: "A", label: "telefon koruli jatek" },
            { key: "B", label: "bizonytalansag" },
            { key: "C", label: "Boraval egyutt kereses" },
          ],
        },
      },
      evidenceBlocks: [
        {
          reflectiveObjectId: "reflective-object-1",
          role: "priority",
          summary: "A telefon eloszor jatek es feszultseg forrasa, kesobb kozos kereses targya.",
          observations: [
            {
              observationV2SceneObservationId: "obs-1",
              sceneId: "scene-1",
              role: "primary_support",
              supportsNodeKeys: ["A", "B", "C"],
              supportsEdgeIndexes: [0, 1],
            },
          ],
        },
      ],
      salienceBand: "high",
      credibilityScore: 0.84,
      reflectivePotentialScore: 0.8,
    },
  };
}

function createValidOutput(): OpeningV2ConstructorOutputPacket {
  return {
    question: "Mi valtozik meg, amikor a telefon leesese utan mar Boraval egyutt keresitek?",
    context:
      "A jelenet elejen a telefon koruli jatek es bizonytalansag kerul eloterbe. A telefon tobbszor leesik, majd mar Boraval egyutt keresitek. Itt a dobalasbol kozos kereses lesz.",
    sourceOpportunityManifestationId: "manifestation-1",
    reflectiveObjectId: "reflective-object-1",
    openingKind: "question",
    sourceRuntime: "opening_v2_constructor_mvp",
  };
}

function createManifestation(): LatentOpportunityManifestation {
  return {
    id: "manifestation-1",
    identityId: "identity-1",
    userId: "user-1",
    priorityReflectiveObjectId: "reflective-object-1",
    summary: "A jatekos telefonos feszultseg kesobb kozos keresesse alakul Boraval.",
    structure: {
      kind: "A_TO_B_TO_C",
      label: "hiding -> uncertainty -> searching together",
      elements: ["telefon", "Bora", "egyutt kereses"],
      metadata: {},
    },
    primaryCategory: "transition",
    secondaryCategories: ["relationship", "tension"],
    credibilityScore: 0.84,
    reflectivePotentialScore: 0.8,
    salienceBand: "high",
    salienceRationale: {},
    constructionMetadata: {},
    archivedAt: null,
    createdAt: "2026-06-18T12:00:00.000Z",
    updatedAt: "2026-06-18T12:00:00.000Z",
    identity: {
      id: "identity-1",
      userId: "user-1",
      title: "telefon -> kereses",
      primaryCategory: "transition",
      secondaryCategories: ["relationship", "tension"],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-06-18T12:00:00.000Z",
      updatedAt: "2026-06-18T12:00:00.000Z",
    },
    evidenceBlocks: [
      {
        id: "block-1",
        manifestationId: "manifestation-1",
        userId: "user-1",
        reflectiveObjectId: "reflective-object-1",
        role: "priority",
        summary: "A telefon koruli jatek kesobb kozos keresesse valik.",
        position: 0,
        createdAt: "2026-06-18T12:00:00.000Z",
        observations: [
          {
            id: "obs-link-1",
            evidenceBlockId: "block-1",
            userId: "user-1",
            observationV2SceneObservationId: "obs-1",
            sceneId: "scene-1",
            role: "primary_support",
            supportsNodeKeys: ["A", "B", "C"],
            supportsEdgeIndexes: [0, 1],
            createdAt: "2026-06-18T12:00:00.000Z",
          },
        ],
      },
    ],
    glossaryLinks: [],
  };
}

function createBoraEviInputPacket(): OpeningV2ConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "opening_v2_constructor_mvp",
      objectLanguage: "hu",
      userId: "user-1",
      reflectiveObjectId: "reflective-object-1",
      sourceOpportunityManifestationId: "manifestation-2",
    },
    opportunity: {
      manifestationId: "manifestation-2",
      summary: "Bora eltunese utan hirtelen idosebbnek erzem magam, mikozben Evi figyelme is megjelenik.",
      primaryCategory: "transition",
      secondaryCategories: ["salience_signal", "relationship"],
      structure: {
        kind: "A_TO_B",
        label: "Bora eltunese -> Idosebbnek erzem magam, Evi figyelme erzekelese",
        elements: [
          "Bora eltunese",
          "Idosebbnek erzem magam",
          "Evi figyelme erzekelese",
        ],
        metadata: {
          nodes: [
            { key: "A", label: "Bora eltunese" },
            { key: "B1", label: "Idosebbnek erzem magam" },
            { key: "B2", label: "Evi figyelme erzekelese" },
          ],
        },
      },
      evidenceBlocks: [
        {
          reflectiveObjectId: "reflective-object-1",
          role: "priority",
          summary: "Bora eltunik, aztan megjelenik az idosebbnek erzes es Evi figyelme.",
          observations: [],
        },
      ],
      salienceBand: "high",
      credibilityScore: 0.85,
      reflectivePotentialScore: 0.85,
    },
  };
}

describe("opening v2 constructor", () => {
  it("accepts compact but specific Hungarian-style question and 2-4 sentence context", () => {
    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: createValidOutput(),
    });

    expect(result.ok).toBe(true);
  });

  it("rejects generic but short questions", () => {
    const output = createValidOutput();
    output.question = "Mi maradt meg benned ebbol?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_not_specific_enough",
      details: expect.objectContaining({
        question: "Mi maradt meg benned ebbol?",
      }),
    });
  });

  it("rejects interpretive meaning questions", () => {
    const output = createValidOutput();
    output.question = "Mit jelent szamodra a telefon keresese Boraval?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_contains_prohibited_authority_language",
      details: expect.objectContaining({
        question: "Mit jelent szamodra a telefon keresese Boraval?",
      }),
    });
  });

  it("rejects explanatory why-questions", () => {
    const output = createValidOutput();
    output.question = "Miert dobtad a telefont, mikozben aggodtal miatta?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_contains_prohibited_explanatory_language",
      details: expect.objectContaining({
        question: "Miert dobtad a telefont, mikozben aggodtal miatta?",
      }),
    });
  });

  it("rejects blunt feeling questions", () => {
    const output = createValidOutput();
    output.question = "Milyen erzesek kavarogtak benned, amikor Boraval kerested a telefont?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_contains_prohibited_blunt_feeling_language",
      details: expect.objectContaining({
        question: "Milyen erzesek kavarogtak benned, amikor Boraval kerested a telefont?",
      }),
    });
  });

  it("rejects reflective-jargon question phrasing", () => {
    const output = createValidOutput();
    output.question = "Milyen gondolatok jarnak at, amikor a telefon leesese utan mar Boraval egyutt keresitek?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_contains_prohibited_reflective_jargon",
      details: expect.objectContaining({
        question: "Milyen gondolatok jarnak at, amikor a telefon leesese utan mar Boraval egyutt keresitek?",
      }),
    });
  });

  it("accepts a turning-point question with concrete dream anchors", () => {
    const output = createValidOutput();
    output.question = "Mi fordul at abban a pillanatban, amikor a telefon dobalasa keresesse valik Boraval?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects questions that try to cover the full opportunity arc", () => {
    const output = createValidOutput();
    output.question = "Mi valtozik meg a telefon dobalasa, a tobbszori leesese es a Boraval kozos keresese kozott?";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_covers_too_much_of_opportunity",
      details: expect.objectContaining({
        question: "Mi valtozik meg a telefon dobalasa, a tobbszori leesese es a Boraval kozos keresese kozott?",
      }),
    });
  });

  it("rejects questions that bundle multiple independent structural shifts", () => {
    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createBoraEviInputPacket(),
      raw: {
        question: "Mi valtozik meg benned, amikor Bora eltunik, es hirtelen idosebbnek erzed magad Evi figyelmenek erzekelese kozben?",
        context: "Bora eltunik a jelenetbol. Ezutan hirtelen idosebbnek erzed magad, es Evi figyelme is megjelenik.",
        sourceOpportunityManifestationId: "manifestation-2",
        reflectiveObjectId: "reflective-object-1",
        openingKind: "question",
        sourceRuntime: "opening_v2_constructor_mvp",
      },
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_contains_multiple_major_shifts",
      details: expect.objectContaining({
        question: "Mi valtozik meg benned, amikor Bora eltunik, es hirtelen idosebbnek erzed magad Evi figyelmenek erzekelese kozben?",
      }),
    });
  });

  it("rejects reordered multi-shift questions that hide bundling in repeated temporal phrasing", () => {
    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createBoraEviInputPacket(),
      raw: {
        question: "Mi tortenik veled, amikor Evi figyelme utan idosebbnek erzed magad a Bora eltunese utan?",
        context: "Bora eltunik a jelenetbol. Ezutan Evi figyelme is megjelenik, es kozben idosebbnek erzed magad.",
        sourceOpportunityManifestationId: "manifestation-2",
        reflectiveObjectId: "reflective-object-1",
        openingKind: "question",
        sourceRuntime: "opening_v2_constructor_mvp",
      },
    });

    expect(result).toEqual({
      ok: false,
      reason: "question_contains_multiple_major_shifts",
      details: expect.objectContaining({
        question: "Mi tortenik veled, amikor Evi figyelme utan idosebbnek erzed magad a Bora eltunese utan?",
      }),
    });
  });

  it("accepts a narrower Bora-Evi turning-point question", () => {
    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createBoraEviInputPacket(),
      raw: {
        question: "Mi tortenik, amikor Bora eltunik a jelenetbol?",
        context: "Bora eltunik a jelenetbol. Utana Evi figyelme marad jelen ebben a reszben.",
        sourceOpportunityManifestationId: "manifestation-2",
        reflectiveObjectId: "reflective-object-1",
        openingKind: "question",
        sourceRuntime: "opening_v2_constructor_mvp",
      },
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a single-action Markus-Kata repair question as one turning point", () => {
    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: {
        generationContext: {
          runtimeVersion: "opening_v2_constructor_mvp",
          objectLanguage: "hu",
          userId: "user-1",
          reflectiveObjectId: "reflective-object-3",
          sourceOpportunityManifestationId: "manifestation-3",
        },
        opportunity: {
          manifestationId: "manifestation-3",
          summary: "Markus nadragjan folt lesz, majd Kata citrommal segit a tisztitasban.",
          primaryCategory: "tension",
          secondaryCategories: ["relationship", "continuity"],
          structure: {
            kind: "TENSION",
            label: "Markus nadragjan folt lesz -> Kata citrommal segit a tisztitasban",
            elements: [
              "Markus foltos nadragja",
              "Kata citrommal segit",
              "tisztitas",
            ],
            metadata: {
              nodes: [
                { key: "issue", label: "Markus foltos nadragja" },
                { key: "repair", label: "Kata citrommal segit a tisztitasban" },
              ],
            },
          },
          evidenceBlocks: [
            {
              reflectiveObjectId: "reflective-object-3",
              role: "priority",
              summary: "Kata citrommal kapcsolodik be Markus nadragjanak tisztitasaba.",
              observations: [],
            },
          ],
          salienceBand: "high",
          credibilityScore: 0.88,
          reflectivePotentialScore: 0.87,
        },
      },
      raw: {
        question: "Mi tortenik, amikor Kata citrommal segit kitisztitani Markus foltos nadragjat?",
        context: "Markus nadragjan folt jelenik meg. Kata citrommal kapcsolodik be a tisztitasba.",
        sourceOpportunityManifestationId: "manifestation-3",
        reflectiveObjectId: "reflective-object-3",
        openingKind: "question",
        sourceRuntime: "opening_v2_constructor_mvp",
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects context that mentions system internals", () => {
    const output = createValidOutput();
    output.context = "Ez az opportunity magas confidence erteku. A rendszer ezt eros latent jelnek latta.";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "context_contains_prohibited_internal_language",
      details: expect.objectContaining({
        sourceOpportunityManifestationId: "manifestation-1",
      }),
    });
  });

  it("rejects coaching or guided-reflection context phrasing", () => {
    const output = createValidOutput();
    output.context = "Bora eltunik, majd idosebbnek erzed magad. Vizsgaljuk meg ezt a valtozast egyutt.";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "context_contains_prohibited_coaching_language",
      details: expect.objectContaining({
        sourceOpportunityManifestationId: "manifestation-1",
      }),
    });
  });

  it("rejects context that slips into reflective instruction or interpretation", () => {
    const output = createValidOutput();
    output.context = "Bora varatlanul eltunik, es Evi figyelmet ereztet maga korul. Figyeld meg, hogyan mesel ez a jelenet a kapcsolati dinamikakrol.";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "context_contains_prohibited_coaching_language",
      details: expect.objectContaining({
        sourceOpportunityManifestationId: "manifestation-1",
      }),
    });
  });

  it("rejects context with prohibited explanatory summary phrases", () => {
    const output = createValidOutput();
    output.context = "A telefon tobbszor leesik, majd Boraval egyutt keresitek. Ez az alom alaphelyzete. A kapcsolat is fontos ebben. Te vagy az, aki ezt ateli.";

    const result = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: output,
    });

    expect(result).toEqual({
      ok: false,
      reason: "context_contains_prohibited_summary_language",
      details: expect.objectContaining({
        sourceOpportunityManifestationId: "manifestation-1",
      }),
    });
  });

  it("maps question to utterance and preserves context provenance", () => {
    const validated = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: createValidOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const mapped = mapValidatedOpeningV2OutputToCreateOpeningInput(validated.value);
    expect(mapped.utterance).toBe("Mi valtozik meg, amikor a telefon leesese utan mar Boraval egyutt keresitek?");
    expect(mapped.provenance.openingContext).toBeTruthy();
    expect(mapped.provenance.sourceOpportunityManifestationId).toBe("manifestation-1");
  });

  it("composes constructor input from a latent opportunity manifestation", () => {
    const packet = composeOpeningV2InputPacket({
      manifestation: createManifestation(),
      objectLanguage: "hu",
    });

    expect(packet.generationContext.sourceOpportunityManifestationId).toBe("manifestation-1");
    expect(packet.generationContext.objectLanguage).toBe("hu");
    expect(packet.opportunity.summary).toContain("Boraval");
    expect(packet.opportunity.evidenceBlocks[0].observations[0].observationV2SceneObservationId).toBe("obs-1");
  });

  it("includes compact-but-specific guidance in the prompt", () => {
    const prompt = buildOpeningV2ConstructorPrompt(createInputPacket());

    expect(prompt).toContain("Keep the question compact but specific.");
    expect(prompt).toContain("Do not summarize the entire opportunity.");
    expect(prompt).toContain("Identify the single most interesting structural turning point.");
    expect(prompt).toContain("Do not include multiple major shifts in the same question.");
    expect(prompt).toContain("If an opportunity contains several transitions, select the most salient one.");
    expect(prompt).toContain("The question should feel like a doorway into the opportunity rather than a summary of it.");
    expect(prompt).toContain("Preserve at least one concrete dream anchor in the question.");
    expect(prompt).toContain("Prefer simple turning-point question forms like 'Mi valtozik meg...?' or 'Mi fordul at...?' when natural.");
    expect(prompt).toContain("A narrower question is usually better than a broader one.");
    expect(prompt).toContain("Do not start the question with forms like 'Milyen erzes...'");
    expect(prompt).toContain("Avoid explanatory or accusatory question forms");
    expect(prompt).toContain("Do not use phrases like 'Vizsgaljuk meg', 'Figyeld meg'");
  });

  it("builds a dedicated repair prompt for invalid drafts", () => {
    const prompt = buildOpeningV2ConstructorPrompt(createInputPacket(), {
      mode: "repair",
      failureReason: "question_contains_multiple_major_shifts",
      previousRawOutput:
        '{"question":"Mi valtozik meg benned, amikor Bora eltunik, es hirtelen idosebbnek erzed magad Evi figyelmenek erzekelese kozben?","context":"Bora eltunik. Evi figyelme is megjelenik.","sourceOpportunityManifestationId":"manifestation-2","reflectiveObjectId":"reflective-object-2","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      repairInstruction:
        "Choose exactly one turning point. Choose exactly one dream anchor. Ignore all competing shifts. Write the smallest question that still preserves the dream anchor. Rewrite the question as natural Hungarian. Prioritize readability over sophistication. Shorter is better.",
    });

    expect(prompt).toContain("Repair the invalid Opening V2 draft below.");
    expect(prompt).toContain("Do not retry broadly. Repair the specific defect.");
    expect(prompt).toContain("Choose exactly one turning point.");
    expect(prompt).toContain("Rewrite the question as natural Hungarian");
    expect(prompt).toContain("Invalid draft JSON:");
    expect(prompt).toContain("question_contains_multiple_major_shifts");
  });

  it("builds a Hungarian polish prompt that preserves meaning and allows unchanged output", () => {
    const validated = parseAndValidateOpeningV2ConstructorOutput({
      input: createInputPacket(),
      raw: createValidOutput(),
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const prompt = buildOpeningV2HungarianPolishPrompt(validated.value);

    expect(prompt).toContain("Polish the Hungarian wording only.");
    expect(prompt).toContain("Keep the selected turning point, dream anchor, and opportunity focus unchanged.");
    expect(prompt).toContain("If the wording is already natural, simple, and concise Hungarian, return it unchanged.");
    expect(prompt).toContain("Rewrite only question and context.");
  });
});
