import { beforeEach, describe, expect, it, vi } from "vitest";

const mockComposeOpeningV2InputPacket = vi.fn();
const mockGenerateOpeningV2ConstructorOutput = vi.fn();
const mockGenerateOpeningV2PolishOutput = vi.fn();
const mockParseAndValidateOpeningV2ConstructorOutput = vi.fn();
const mockMapValidatedOpeningV2OutputToCreateOpeningInput = vi.fn();

vi.mock("@/src/cognition/openings/opening-v2-constructor", () => ({
  composeOpeningV2InputPacket: mockComposeOpeningV2InputPacket,
  generateOpeningV2ConstructorOutput: mockGenerateOpeningV2ConstructorOutput,
  generateOpeningV2PolishOutput: mockGenerateOpeningV2PolishOutput,
  parseAndValidateOpeningV2ConstructorOutput: mockParseAndValidateOpeningV2ConstructorOutput,
  mapValidatedOpeningV2OutputToCreateOpeningInput: mockMapValidatedOpeningV2OutputToCreateOpeningInput,
}));

describe("generateOpeningV2CreateInputFromManifestation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("runs a separate Hungarian polish step after valid generation", async () => {
    const packet = {
      generationContext: {
        runtimeVersion: "opening_v2_constructor_mvp",
        objectLanguage: "hu",
        userId: "user-1",
        reflectiveObjectId: "reflective-object-polish",
        sourceOpportunityManifestationId: "manifestation-polish",
      },
      opportunity: {
        manifestationId: "manifestation-polish",
        summary: "Kata citrommal segit Markus nadragjanak tisztitasaban.",
        primaryCategory: "tension",
        secondaryCategories: [],
        structure: {
          kind: "TENSION",
          label: "Kata segit Markus nadragjan",
          elements: ["Kata", "Markus nadragja", "tisztitas"],
        },
        evidenceBlocks: [],
        salienceBand: "high",
        credibilityScore: 0.9,
        reflectivePotentialScore: 0.9,
      },
    };

    const validatedOutput = {
      question: "Mi valtozik meg, amikor Kata citrommal segit takaritani Markus feher vaszonnadragjan?",
      context: "Markus nadragjan folt keletkezik. Kata citrommal segit a tisztitasban.",
      sourceOpportunityManifestationId: "manifestation-polish",
      reflectiveObjectId: "reflective-object-polish",
      openingKind: "question",
      sourceRuntime: "opening_v2_constructor_mvp",
      inputPacket: packet,
    };

    mockComposeOpeningV2InputPacket.mockReturnValue(packet);
    mockGenerateOpeningV2ConstructorOutput.mockResolvedValueOnce({
      mode: "generated",
      rawOutput: JSON.stringify(validatedOutput),
    });
    mockGenerateOpeningV2PolishOutput.mockResolvedValueOnce({
      mode: "generated",
      rawOutput: JSON.stringify({
        ...validatedOutput,
        question: "Mi valtozik meg, amikor Kata segiteni kezd Markus nadragjanak tisztitasaban?",
      }),
    });
    mockParseAndValidateOpeningV2ConstructorOutput
      .mockReturnValueOnce({
        ok: true,
        value: validatedOutput,
      })
      .mockReturnValueOnce({
        ok: true,
        value: {
          ...validatedOutput,
          question: "Mi valtozik meg, amikor Kata segiteni kezd Markus nadragjanak tisztitasaban?",
        },
      });
    mockMapValidatedOpeningV2OutputToCreateOpeningInput.mockReturnValue({
      utterance: "Mi valtozik meg, amikor Kata segiteni kezd Markus nadragjanak tisztitasaban?",
      provenance: {},
    });

    const { generateOpeningV2CreateInputFromManifestation } = await import(
      "@/src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input"
    );

    const result = await generateOpeningV2CreateInputFromManifestation({
      manifestation: { id: "manifestation-polish" } as never,
      objectLanguage: "hu",
    });

    expect(mockGenerateOpeningV2PolishOutput).toHaveBeenCalledWith({
      packet,
      validated: validatedOutput,
    });
    expect(result).toEqual({
      mode: "generated",
      packet,
      rawOutput: JSON.stringify({
        ...validatedOutput,
        question: "Mi valtozik meg, amikor Kata segiteni kezd Markus nadragjanak tisztitasaban?",
      }),
      opening: {
        utterance: "Mi valtozik meg, amikor Kata segiteni kezd Markus nadragjanak tisztitasaban?",
        provenance: {},
      },
      attempts: 1,
      polishStatus: "applied",
    });
  });

  it("falls back to the original valid opening when Hungarian polish becomes invalid", async () => {
    const packet = {
      generationContext: {
        runtimeVersion: "opening_v2_constructor_mvp",
        objectLanguage: "hu",
        userId: "user-1",
        reflectiveObjectId: "reflective-object-fallback",
        sourceOpportunityManifestationId: "manifestation-fallback",
      },
      opportunity: {
        manifestationId: "manifestation-fallback",
        summary: "Bora eltunik a jelenetbol.",
        primaryCategory: "transition",
        secondaryCategories: [],
        structure: {
          kind: "A_TO_B",
          label: "Bora eltunik",
          elements: ["Bora eltunik"],
        },
        evidenceBlocks: [],
        salienceBand: "high",
        credibilityScore: 0.9,
        reflectivePotentialScore: 0.9,
      },
    };

    const validatedOutput = {
      question: "Mi valtozik meg benned a pillanatban, amikor Bora eltunik?",
      context: "Bora eltunik a jelenetbol. Utana mas figyelem marad jelen.",
      sourceOpportunityManifestationId: "manifestation-fallback",
      reflectiveObjectId: "reflective-object-fallback",
      openingKind: "question",
      sourceRuntime: "opening_v2_constructor_mvp",
      inputPacket: packet,
    };

    mockComposeOpeningV2InputPacket.mockReturnValue(packet);
    mockGenerateOpeningV2ConstructorOutput.mockResolvedValueOnce({
      mode: "generated",
      rawOutput: JSON.stringify(validatedOutput),
    });
    mockGenerateOpeningV2PolishOutput.mockResolvedValueOnce({
      mode: "generated",
      rawOutput: JSON.stringify({
        ...validatedOutput,
        question: "Miert valik ez olyan fontossa?",
      }),
    });
    mockParseAndValidateOpeningV2ConstructorOutput
      .mockReturnValueOnce({
        ok: true,
        value: validatedOutput,
      })
      .mockReturnValueOnce({
        ok: false,
        reason: "question_contains_prohibited_explanatory_language",
        details: {
          question: "Miert valik ez olyan fontossa?",
        },
      });
    mockMapValidatedOpeningV2OutputToCreateOpeningInput.mockReturnValue({
      utterance: "Mi valtozik meg benned a pillanatban, amikor Bora eltunik?",
      provenance: {},
    });

    const { generateOpeningV2CreateInputFromManifestation } = await import(
      "@/src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input"
    );

    const result = await generateOpeningV2CreateInputFromManifestation({
      manifestation: { id: "manifestation-fallback" } as never,
      objectLanguage: "hu",
    });

    expect(mockGenerateOpeningV2PolishOutput).toHaveBeenCalledWith({
      packet,
      validated: validatedOutput,
    });
    expect(result).toEqual({
      mode: "generated",
      packet,
      rawOutput: JSON.stringify(validatedOutput),
      opening: {
        utterance: "Mi valtozik meg benned a pillanatban, amikor Bora eltunik?",
        provenance: {},
      },
      attempts: 1,
      polishStatus: "fallback_validation_failure",
    });
  });

  it("retries once with a repair instruction after validation failure", async () => {
    const packet = {
      generationContext: {
        runtimeVersion: "opening_v2_constructor_mvp",
        objectLanguage: "hu",
        userId: "user-1",
        reflectiveObjectId: "reflective-object-1",
        sourceOpportunityManifestationId: "manifestation-1",
      },
      opportunity: {
        manifestationId: "manifestation-1",
        summary: "telefon es Bora",
        primaryCategory: "transition",
        secondaryCategories: [],
        structure: {
          kind: "A_TO_B",
          label: "telefon -> kereses",
          elements: ["telefon", "Bora"],
        },
        evidenceBlocks: [],
        salienceBand: "high",
        credibilityScore: 0.9,
        reflectivePotentialScore: 0.9,
      },
    };

    const manifestation = {
      id: "manifestation-1",
    };

    const opening = {
      utterance: "Mi maradt meg benned abbol, amikor Boraval kerested a telefont?",
      provenance: {},
    };

    mockComposeOpeningV2InputPacket.mockReturnValue(packet);
    mockGenerateOpeningV2ConstructorOutput
      .mockResolvedValueOnce({
        mode: "generated",
        rawOutput: '{"question":"Mi valtozik meg?","context":"Rovid.","sourceOpportunityManifestationId":"manifestation-1","reflectiveObjectId":"reflective-object-1","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      })
      .mockResolvedValueOnce({
        mode: "generated",
        rawOutput: '{"question":"Mi maradt meg benned abbol, amikor Boraval kerested a telefont?","context":"A jelenet elejen a telefon koruli feszultseg all eloterben. Kesobb mar Boraval egyutt keresitek a telefont.","sourceOpportunityManifestationId":"manifestation-1","reflectiveObjectId":"reflective-object-1","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      });
    mockParseAndValidateOpeningV2ConstructorOutput
      .mockReturnValueOnce({
        ok: false,
        reason: "question_not_specific_enough",
        details: { question: "Mi valtozik meg?" },
      })
      .mockReturnValueOnce({
        ok: true,
        value: {
          question: "Mi maradt meg benned abbol, amikor Boraval kerested a telefont?",
          context: "A jelenet elejen a telefon koruli feszultseg all eloterben. Kesobb mar Boraval egyutt keresitek a telefont.",
          sourceOpportunityManifestationId: "manifestation-1",
          reflectiveObjectId: "reflective-object-1",
          openingKind: "question",
          sourceRuntime: "opening_v2_constructor_mvp",
          inputPacket: packet,
        },
      });
    mockGenerateOpeningV2PolishOutput.mockResolvedValueOnce({
      mode: "failed",
      reason: "provider_error",
    });
    mockMapValidatedOpeningV2OutputToCreateOpeningInput.mockReturnValue(opening);

    const { generateOpeningV2CreateInputFromManifestation } = await import(
      "@/src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input"
    );

    const result = await generateOpeningV2CreateInputFromManifestation({
      manifestation: manifestation as never,
      objectLanguage: "hu",
    });

    expect(mockGenerateOpeningV2ConstructorOutput).toHaveBeenCalledTimes(2);
    expect(mockGenerateOpeningV2ConstructorOutput).toHaveBeenNthCalledWith(1, {
      packet,
      repairTask: undefined,
    });
    expect(mockGenerateOpeningV2ConstructorOutput).toHaveBeenNthCalledWith(2, {
      packet,
      repairTask: expect.objectContaining({
        mode: "repair",
        failureReason: "question_not_specific_enough",
        previousRawOutput: '{"question":"Mi valtozik meg?","context":"Rovid.","sourceOpportunityManifestationId":"manifestation-1","reflectiveObjectId":"reflective-object-1","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
        repairInstruction: expect.stringContaining("explicitly names concrete dream material"),
      }),
    });
    expect(result).toEqual({
      mode: "generated",
      packet,
      rawOutput: '{"question":"Mi maradt meg benned abbol, amikor Boraval kerested a telefont?","context":"A jelenet elejen a telefon koruli feszultseg all eloterben. Kesobb mar Boraval egyutt keresitek a telefont.","sourceOpportunityManifestationId":"manifestation-1","reflectiveObjectId":"reflective-object-1","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      opening,
      attempts: 2,
      polishStatus: "fallback_provider_failure",
    });
  });

  it("uses dedicated multi-shift repair guidance instead of broad retry", async () => {
    const packet = {
      generationContext: {
        runtimeVersion: "opening_v2_constructor_mvp",
        objectLanguage: "hu",
        userId: "user-1",
        reflectiveObjectId: "reflective-object-2",
        sourceOpportunityManifestationId: "manifestation-2",
      },
      opportunity: {
        manifestationId: "manifestation-2",
        summary: "Bora eltunik, aztan idosebbnek erzem magam es Evi figyelme jelenik meg.",
        primaryCategory: "transition",
        secondaryCategories: [],
        structure: {
          kind: "A_TO_B",
          label: "Bora eltunese -> idosebbnek erzem magam, Evi figyelme",
          elements: ["Bora eltunese", "idosebbnek erzem magam", "Evi figyelme"],
        },
        evidenceBlocks: [],
        salienceBand: "high",
        credibilityScore: 0.9,
        reflectivePotentialScore: 0.9,
      },
    };

    mockComposeOpeningV2InputPacket.mockReturnValue(packet);
    mockGenerateOpeningV2ConstructorOutput
      .mockResolvedValueOnce({
        mode: "generated",
        rawOutput: '{"question":"Mi valtozik meg benned, amikor Bora eltunik, es hirtelen idosebbnek erzed magad Evi figyelmenek erzekelese kozben?","context":"Bora eltunik. Evi figyelme is megjelenik.","sourceOpportunityManifestationId":"manifestation-2","reflectiveObjectId":"reflective-object-2","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      })
      .mockResolvedValueOnce({
        mode: "generated",
        rawOutput: '{"question":"Mi valtozik meg benned, amikor Bora eltunik az alomban?","context":"Bora eltunik a jelenetbol. Utana mas figyelem marad jelen.","sourceOpportunityManifestationId":"manifestation-2","reflectiveObjectId":"reflective-object-2","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      });
    mockParseAndValidateOpeningV2ConstructorOutput
      .mockReturnValueOnce({
        ok: false,
        reason: "question_contains_multiple_major_shifts",
        details: {
          question: "Mi valtozik meg benned, amikor Bora eltunik, es hirtelen idosebbnek erzed magad Evi figyelmenek erzekelese kozben?",
        },
      })
      .mockReturnValueOnce({
        ok: true,
        value: {
          question: "Mi valtozik meg benned, amikor Bora eltunik az alomban?",
          context: "Bora eltunik a jelenetbol. Utana mas figyelem marad jelen.",
          sourceOpportunityManifestationId: "manifestation-2",
          reflectiveObjectId: "reflective-object-2",
          openingKind: "question",
          sourceRuntime: "opening_v2_constructor_mvp",
          inputPacket: packet,
        },
      });
    mockGenerateOpeningV2PolishOutput.mockResolvedValueOnce({
      mode: "failed",
      reason: "provider_error",
    });
    mockMapValidatedOpeningV2OutputToCreateOpeningInput.mockReturnValue({
      utterance: "Mi valtozik meg benned, amikor Bora eltunik az alomban?",
      provenance: {},
    });

    const { generateOpeningV2CreateInputFromManifestation } = await import(
      "@/src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input"
    );

    await generateOpeningV2CreateInputFromManifestation({
      manifestation: { id: "manifestation-2" } as never,
      objectLanguage: "hu",
    });

    expect(mockGenerateOpeningV2ConstructorOutput).toHaveBeenNthCalledWith(2, {
      packet,
      repairTask: expect.objectContaining({
        mode: "repair",
        failureReason: "question_contains_multiple_major_shifts",
        repairInstruction: expect.stringContaining("Choose exactly one turning point"),
      }),
    });
  });

  it("adds concrete Hungarian rewrite guidance for abstract repair failures", async () => {
    const packet = {
      generationContext: {
        runtimeVersion: "opening_v2_constructor_mvp",
        objectLanguage: "hu",
        userId: "user-1",
        reflectiveObjectId: "reflective-object-4",
        sourceOpportunityManifestationId: "manifestation-4",
      },
      opportunity: {
        manifestationId: "manifestation-4",
        summary: "Telefon leesik, majd Boraval keresitek.",
        primaryCategory: "transition",
        secondaryCategories: [],
        structure: {
          kind: "A_TO_B",
          label: "telefon leesik -> Boraval keresitek",
          elements: ["telefon leesik", "Boraval keresitek"],
        },
        evidenceBlocks: [],
        salienceBand: "high",
        credibilityScore: 0.9,
        reflectivePotentialScore: 0.9,
      },
    };

    mockComposeOpeningV2InputPacket.mockReturnValue(packet);
    mockGenerateOpeningV2ConstructorOutput
      .mockResolvedValueOnce({
        mode: "generated",
        rawOutput: '{"question":"Milyen gondolatok jarnak at, amikor a telefon leesik?","context":"A telefon leesik. Utana keresni kezditek.","sourceOpportunityManifestationId":"manifestation-4","reflectiveObjectId":"reflective-object-4","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      })
      .mockResolvedValueOnce({
        mode: "generated",
        rawOutput: '{"question":"Mi tortenik, amikor a telefon leesik?","context":"A telefon leesik. Utana keresni kezditek.","sourceOpportunityManifestationId":"manifestation-4","reflectiveObjectId":"reflective-object-4","openingKind":"question","sourceRuntime":"opening_v2_constructor_mvp"}',
      });
    mockParseAndValidateOpeningV2ConstructorOutput
      .mockReturnValueOnce({
        ok: false,
        reason: "question_contains_prohibited_reflective_jargon",
        details: {
          question: "Milyen gondolatok jarnak at, amikor a telefon leesik?",
        },
      })
      .mockReturnValueOnce({
        ok: true,
        value: {
          question: "Mi tortenik, amikor a telefon leesik?",
          context: "A telefon leesik. Utana keresni kezditek.",
          sourceOpportunityManifestationId: "manifestation-4",
          reflectiveObjectId: "reflective-object-4",
          openingKind: "question",
          sourceRuntime: "opening_v2_constructor_mvp",
          inputPacket: packet,
        },
      });
    mockGenerateOpeningV2PolishOutput.mockResolvedValueOnce({
      mode: "failed",
      reason: "provider_error",
    });
    mockMapValidatedOpeningV2OutputToCreateOpeningInput.mockReturnValue({
      utterance: "Mi tortenik, amikor a telefon leesik?",
      provenance: {},
    });

    const { generateOpeningV2CreateInputFromManifestation } = await import(
      "@/src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input"
    );

    await generateOpeningV2CreateInputFromManifestation({
      manifestation: { id: "manifestation-4" } as never,
      objectLanguage: "hu",
    });

    expect(mockGenerateOpeningV2ConstructorOutput).toHaveBeenNthCalledWith(2, {
      packet,
      repairTask: expect.objectContaining({
        mode: "repair",
        failureReason: "question_contains_prohibited_reflective_jargon",
        repairInstruction: expect.stringContaining("Rewrite the question as natural Hungarian"),
      }),
    });
    expect(mockGenerateOpeningV2ConstructorOutput).toHaveBeenNthCalledWith(2, {
      packet,
      repairTask: expect.objectContaining({
        repairInstruction: expect.stringContaining("Replace abstract wording with concrete dream material"),
      }),
    });
  });
});
