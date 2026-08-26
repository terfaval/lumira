import { describe, expect, it } from "vitest";

import type { FortuneFacilitatorPacket } from "@/src/features/fortune-journaling/facilitator/facilitator-types";
import {
  evaluateFortuneFacilitatorBehaviorSuite,
} from "@/src/features/fortune-journaling/facilitator/fortune-facilitator-behavior-eval";

describe("fortune facilitator behavior eval", () => {
  it("flags card-reading leakage and unsupported psychologizing in the real boundaries regression case", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-a-card-reading-leakage",
        packet: buildBoundariesPacket({
          focusText:
            "Mostanában egyre több feladatot vállalok egy olyan munkában, amit alapvetően szeretek, de kezdem azt érezni, hogy túl sok figyelmet visz el. Nehéz eldöntenem, hogy azért akarok-e visszavenni, mert tényleg szükségem van több térre, vagy csak menekülök attól, hogy nagyobb felelősséget vállaljak.",
        }),
        output: {
          mode: "question",
          reflection:
            "A Mágus, mint amit védesz, mintha a tudatos irányításodat és a teremtő erőt reprezentálná ebben a helyzetben, míg a Csillag, amit beengednél, a remény és a bizalom érzetét jelzi, ami talán könnyedséget vagy új perspektívát hozhat.",
          question:
            "Milyen belső hang vagy érzés segíthet felismerni, hogy a tér igénye valós szükséglet vagy menekülés a felelősség elől?",
        },
        expectations: {
          rejectCardReadingLeakage: true,
          rejectUnsupportedPsychologizing: true,
          requireSingleQuestion: true,
          rejectOracleLanguage: true,
        },
      },
    ]);

    expect(suite.failedCases).toEqual(["case-a-card-reading-leakage"]);
    expect(suite.caseResults[0]?.failures).toContain("card_reading_leakage");
    expect(suite.caseResults[0]?.failures).toContain("unsupported_psychologizing");
  });

  it("catches unsupported psychological hypotheses when the user did not introduce them", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-b-unsupported-psychologizing",
        packet: buildBoundariesPacket({
          focusText: "Mostanában úgy érzem, hogy több térre lenne szükségem ebben a munkában.",
        }),
        output: {
          mode: "question",
          reflection: "Lehet, hogy valójában a nagyobb elköteleződéstől félsz, és ezért húzódnál vissza.",
          question: "Mitől félsz igazán ebben a helyzetben?",
        },
        expectations: {
          rejectUnsupportedPsychologizing: true,
          requireSingleQuestion: true,
        },
      },
    ]);

    expect(suite.failedCases).toEqual(["case-b-unsupported-psychologizing"]);
    expect(suite.caseResults[0]?.failures).toContain("unsupported_psychologizing");
  });

  it("allows difficult hypotheses when the user introduced them", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-c-user-authored-hypothesis",
        packet: buildBoundariesPacket({
          focusText:
            "Több térre lenne szükségem, de attól tartok, hogy talán csak kerülöm a felelősséget.",
        }),
        output: {
          mode: "question",
          reflection:
            "Úgy tűnik, benned is megjelent a kérdés, hogy ez valódi szükséglet, vagy inkább hátralépés.",
          question: "Miből vennéd észre, hogy itt valóban több tér támogatna téged?",
        },
        expectations: {
          rejectUnsupportedPsychologizing: true,
          requireSingleQuestion: true,
          requireUserAnchors: ["tér", "felelősség"],
        },
      },
    ]);

    expect(suite.passedCases).toEqual(["case-c-user-authored-hypothesis"]);
  });

  it("accepts mode-aware outputs without explicit card-reading prose", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-d-timeline",
        packet: buildTimelinePacket(),
        output: {
          mode: "question",
          reflection: "Mintha egyszerre lenne jelen valami, amit még hozol magaddal, és valami, ami most kezd formálódni.",
          question: "Hol érzed most a legerősebben, hogy a múlt lenyomata még alakítja azt, ami benned készül?",
        },
        expectations: {
          rejectCardReadingLeakage: true,
          rejectUnsupportedPsychologizing: true,
          requireSingleQuestion: true,
          rejectOracleLanguage: true,
          requireUserAnchors: ["múlt", "formálód"],
        },
      },
      {
        caseId: "case-d-boundaries",
        packet: buildBoundariesPacket({
          focusText: "Nem tudom, miből kellene visszafognom, és minek kellene több teret adnom.",
        }),
        output: {
          mode: "question",
          reflection: "A két pozíció mintha valami őrzöttet és valami beengedhetőt tenne egymás mellé.",
          question: "Amikor több térre gondolsz, miből érzed, hogy mit szeretnél inkább védeni, és minek adnál helyet?",
        },
        expectations: {
          rejectCardReadingLeakage: true,
          rejectUnsupportedPsychologizing: true,
          requireSingleQuestion: true,
          rejectOracleLanguage: true,
          requireUserAnchors: ["tér", "védeni", "helyet"],
        },
      },
    ]);

    expect(suite.failedCases).toEqual([]);
    expect(suite.passedCases).toEqual(["case-d-timeline", "case-d-boundaries"]);
  });

  it("fails outputs that contain multiple independent questions", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-e-multiple-questions",
        packet: buildBoundariesPacket({
          focusText: "Nem tudom, hogy mire lenne most igazán szükségem.",
        }),
        output: {
          mode: "question",
          reflection: "Mintha egyszerre több irány húzna.",
          question: "Mit érzel ezzel kapcsolatban? Honnan jön ez? Mit változtatnál rajta?",
        },
        expectations: {
          requireSingleQuestion: true,
        },
      },
    ]);

    expect(suite.failedCases).toEqual(["case-e-multiple-questions"]);
    expect(suite.caseResults[0]?.failures).toContain("multiple_questions");
  });

  it("fails prediction and oracle wording", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-f-oracle-language",
        packet: buildTimelinePacket(),
        output: {
          mode: "question",
          reflection: "A lapok szerint ez azt jelzi, hogy a jövőben elkerülhetetlenül irányt váltasz.",
          question: "Készen állsz erre a fordulatra?",
        },
        expectations: {
          rejectOracleLanguage: true,
          requireSingleQuestion: true,
        },
      },
    ]);

    expect(suite.failedCases).toEqual(["case-f-oracle-language"]);
    expect(suite.caseResults[0]?.failures).toContain("oracle_or_prediction_language");
  });

  it("passes user-language anchoring when the output stays close to distinctive user wording", () => {
    const suite = evaluateFortuneFacilitatorBehaviorSuite([
      {
        caseId: "case-g-user-language-anchoring",
        packet: buildBoundariesPacket({
          focusText:
            "Azt érzem, hogy ez a munka túl sok figyelmet visz el, és nem tudom, miből kellene visszavennem, hogy több tér maradjon.",
        }),
        output: {
          mode: "question",
          reflection: "Úgy hangzik, egyszerre van jelen benned a túl sok figyelem terhe és a több tér igénye.",
          question: "Miből vennéd észre először, hogy valami már nem csak sok figyelmet visz el, hanem tényleg túl sokat?",
        },
        expectations: {
          rejectCardReadingLeakage: true,
          rejectUnsupportedPsychologizing: true,
          requireSingleQuestion: true,
          requireUserAnchors: ["figyelmet visz", "tér"],
        },
      },
    ]);

    expect(suite.passedCases).toEqual(["case-g-user-language-anchoring"]);
  });
});

function buildBoundariesPacket(input?: {
  focusText?: string;
}): FortuneFacilitatorPacket {
  return {
    sessionId: "session-boundaries",
    mode: {
      id: "boundaries",
      name: "Határ és áteresztés",
      description: "Segít látni, mit védesz, és minek engednél több teret.",
      orientation: "Gondolj arra, amit most óvnál, és arra, aminek talán több helyet adnál.",
      questionProfile: {
        id: "boundaries",
        focus: ["határok", "beengedés / védelem"],
      },
    },
    focusText: input?.focusText ?? "Több térre lenne szükségem ebben a helyzetben.",
    firstInterpretation: null,
    cards: [
      {
        id: "the_magician",
        name_hu: "A Mágus",
        position: {
          key: "protect",
          label: "Amit védek",
        },
        archetype: "alkotó szándék",
        summary: "tudatos irányítás és fókusz",
        interpretationAxes: ["fókusz", "irányítás", "kezdeményezés"],
      },
      {
        id: "the_star",
        name_hu: "A Csillag",
        position: {
          key: "allow",
          label: "Amit beengednék",
        },
        archetype: "bizalom",
        summary: "tágasság és remény",
        interpretationAxes: ["remény", "nyitottság", "bizalom"],
      },
    ],
    turns: [],
  };
}

function buildTimelinePacket(): FortuneFacilitatorPacket {
  return {
    sessionId: "session-timeline",
    mode: {
      id: "timeline",
      name: "Idősík",
      description: "A helyzetet múlt, jelen és formálódó irány szerint rendezi.",
      orientation: "Nézd meg, mi maradt veled a múltból, mi mozog most, és mi alakul.",
      questionProfile: {
        id: "temporal_flow",
        focus: ["múlt hatása", "jelen dinamika", "ami formálódik"],
      },
    },
    focusText: "Egy döntésnél érzem, hogy valami régebbi minta még mindig hat rám.",
    firstInterpretation: null,
    cards: [
      {
        id: "the_fool",
        name_hu: "A Bolond",
        position: {
          key: "past_trace",
          label: "Múlt lenyomata",
        },
        archetype: "kezdet",
        summary: "nyitottság és kockázat",
        interpretationAxes: ["kezdet", "szabadság", "kockázat"],
      },
      {
        id: "the_world",
        name_hu: "A Világ",
        position: {
          key: "forming",
          label: "Ami formálódik",
        },
        archetype: "beteljesedés",
        summary: "összeérés és tágulás",
        interpretationAxes: ["teljesség", "összeérés", "távlat"],
      },
    ],
    turns: [],
  };
}
