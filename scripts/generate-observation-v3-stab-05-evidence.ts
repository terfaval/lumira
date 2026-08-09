import fs from "node:fs/promises";
import path from "node:path";

import { composeMemoryPackages } from "@/src/cognition/observation-v3/memory-composition";

type Region = Parameters<typeof composeMemoryPackages>[0]["baseline"]["regions"][number];
type Unit = Parameters<typeof composeMemoryPackages>[0]["baseline"]["units"][number];

function makeRegion(input: Partial<Region> & Pick<Region, "regionId" | "order">): Region {
  return {
    heading: null,
    spanStart: null,
    spanEnd: null,
    evidence: [],
    boundaryConfidence: "medium",
    uncertainty: null,
    transitionCues: [],
    ...input,
  };
}

function makeUnit(input: Partial<Unit> & Pick<Unit, "observationId" | "regionId" | "order" | "statement">): Unit {
  return {
    evidence: [],
    uncertainty: null,
    source: "baseline",
    recoveryProvenance: null,
    ...input,
  };
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

interface PipelineResultLike {
  summary: {
    finalOutcome: string;
  };
  stageResults: Array<{
    stage: string;
    payload?: {
      result?: {
        duplicateAnalysis?: {
          unresolvedOverlaps?: unknown[];
        };
        canonicalCandidate?: {
          uncertaintyRecords?: Array<{
            uncertaintyType: string;
          }>;
        };
      };
    };
  }>;
}

function findStage(result: PipelineResultLike, stage: string) {
  return result.stageResults.find((entry) => entry.stage === stage);
}

function buildHistoricalObsE001Regression() {
  return composeMemoryPackages({
    dreamTextLength: 720,
    baseline: {
      regions: [
        makeRegion({
          regionId: "scene-1",
          order: 0,
          heading: "Money exchange",
          spanStart: 219,
          spanEnd: 399,
          evidence: [{ snippet: "money exchange", spanStart: 219, spanEnd: 399, contextLabel: "window" }],
        }),
        makeRegion({
          regionId: "scene-2",
          order: 1,
          heading: "Food complaint",
          spanStart: 400,
          spanEnd: 472,
          evidence: [{ snippet: "gomboc", spanStart: 400, spanEnd: 472, contextLabel: "window" }],
        }),
      ],
      units: [
        {
          ...makeUnit({
            observationId: "obs-money-1",
            regionId: "scene-1",
            order: 0,
            statement: "Jozsi took Milan shopping but gave him 5000 less, which upset him.",
            evidence: [{ snippet: "shopping 5000 less", spanStart: 219, spanEnd: 295, contextLabel: "window" }],
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "obs-money-2",
            regionId: "scene-1",
            order: 1,
            statement: "The dreamer gave Milan the missing money, though would not have done so while awake.",
            evidence: [{ snippet: "gave him the money", spanStart: 296, spanEnd: 370, contextLabel: "window" }],
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "obs-money-3",
            regionId: "scene-1",
            order: 2,
            statement: "The dreamer told Milan to keep asking for the missing amount.",
            evidence: [{ snippet: "keep asking", spanStart: 371, spanEnd: 399, contextLabel: "window" }],
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "obs-food-1",
            regionId: "scene-2",
            order: 0,
            statement: "Mama cooked, but the dreamer could only eat dumplings.",
            evidence: [{ snippet: "could only eat dumplings", spanStart: 400, spanEnd: 436, contextLabel: "window" }],
            uncertainty: "The exact food detail is somewhat uncertain.",
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "obs-food-2",
            regionId: "scene-2",
            order: 1,
            statement: "The dreamer complained that Mama always cooks in a way they cannot eat.",
            evidence: [{ snippet: "always cooks in a way", spanStart: 437, spanEnd: 472, contextLabel: "window" }],
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    },
    supplemental: {
      regions: [
        makeRegion({
          regionId: "recovery-1",
          order: 0,
          heading: "Money restatement",
          spanStart: 219,
          spanEnd: 399,
          evidence: [{ snippet: "money exchange", spanStart: 219, spanEnd: 399, contextLabel: "window" }],
        }),
        makeRegion({
          regionId: "recovery-2",
          order: 1,
          heading: "Food restatement",
          spanStart: 400,
          spanEnd: 472,
          evidence: [{ snippet: "gomboc", spanStart: 400, spanEnd: 472, contextLabel: "window" }],
        }),
      ],
      units: [
        {
          ...makeUnit({
            observationId: "recovery-money",
            regionId: "recovery-1",
            order: 0,
            statement: "Jozsi took Milan shopping, gave him 5000 less, and the dreamer ended up giving Milan the missing money even though they would not have done so while awake.",
            source: "recovery",
            evidence: [{ snippet: "shopping and gave money", spanStart: 296, spanEnd: 370, contextLabel: "window" }],
            recoveryProvenance: {
              canonicalRecoveryWindowId: "window-money-1",
              physicalGapId: "gap-money-1",
              extractionLocalRegionId: "recovery-1",
              semanticSignature: "jozsi took milan shopping gave him 5000 less and the dreamer gave the missing money",
              entitySignature: ["dreamer", "jozsi", "milan", "money"],
              eventStateType: "event",
            },
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "recovery-food",
            regionId: "recovery-2",
            order: 0,
            statement: "Mama cooked, but the dreamer could only eat dumplings and complained that Mama always cooks in a way they cannot eat.",
            source: "recovery",
            evidence: [{ snippet: "dumplings and complaint", spanStart: 400, spanEnd: 472, contextLabel: "window" }],
            recoveryProvenance: {
              canonicalRecoveryWindowId: "window-food-1",
              physicalGapId: "gap-food-1",
              extractionLocalRegionId: "recovery-2",
              semanticSignature: "mama cooked but the dreamer could only eat dumplings and complained",
              entitySignature: ["complained", "dreamer", "dumplings", "mama"],
              eventStateType: "state",
            },
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    },
  });
}

function buildConfirmedDuplicateControl() {
  return composeMemoryPackages({
    dreamTextLength: 96,
    baseline: {
      regions: [
        makeRegion({
          regionId: "scene-1",
          order: 0,
          heading: "Kozmo",
          spanStart: 0,
          spanEnd: 71,
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        }),
      ],
      units: [
        {
          ...makeUnit({
            observationId: "obs-1",
            regionId: "scene-1",
            order: 0,
            statement: "Kozmo meghal.",
            evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    },
    supplemental: {
      regions: [
        makeRegion({
          regionId: "recovery-1",
          order: 0,
          heading: "Duplicate tail",
          spanStart: 0,
          spanEnd: 95,
          evidence: [{ snippet: "kozmo meghal ... uj eletre kel", spanStart: 0, spanEnd: 95, contextLabel: "window" }],
        }),
      ],
      units: [
        {
          ...makeUnit({
            observationId: "recovery-1",
            regionId: "recovery-1",
            order: 0,
            statement: "kozmo meghal",
            evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 10, contextLabel: null }],
            source: "recovery",
            recoveryProvenance: {
              canonicalRecoveryWindowId: "window-1",
              physicalGapId: "physical-gap-1",
              extractionLocalRegionId: "recovery-1",
              semanticSignature: "kozmo meghal",
              entitySignature: ["kozmo"],
              eventStateType: "event",
            },
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    },
  });
}

function buildCoexistenceControl() {
  return composeMemoryPackages({
    dreamTextLength: 1800,
    baseline: {
      regions: [
        makeRegion({
          regionId: "room",
          order: 0,
          heading: "Upper room",
          spanStart: 600,
          spanEnd: 980,
          evidence: [{ snippet: "upper room", spanStart: 600, spanEnd: 980, contextLabel: "room" }],
        }),
      ],
      units: [
        {
          ...makeUnit({
            observationId: "obs-bed",
            regionId: "room",
            order: 0,
            statement: "There was a bizarre bed high on the wall.",
            evidence: [{ snippet: "bizarre bed", spanStart: 730, spanEnd: 780, contextLabel: "room" }],
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "obs-ladder",
            regionId: "room",
            order: 1,
            statement: "A slanted ladder could be used like stairs to reach it.",
            evidence: [{ snippet: "slanted ladder", spanStart: 781, spanEnd: 840, contextLabel: "room" }],
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    },
    supplemental: {
      regions: [
        makeRegion({
          regionId: "recovery-room",
          order: 0,
          heading: "Recovered room detail",
          spanStart: 730,
          spanEnd: 1120,
          evidence: [{ snippet: "room detail", spanStart: 730, spanEnd: 1120, contextLabel: "room" }],
        }),
      ],
      units: [
        {
          ...makeUnit({
            observationId: "recovery-room-1",
            regionId: "recovery-room",
            order: 0,
            statement: "The high wall bed used an unusual slanted ladder that had to be made rigid and hooked into place as shown on the first night.",
            source: "recovery",
            evidence: [{ snippet: "rigid and hooked into place", spanStart: 760, spanEnd: 910, contextLabel: "room" }],
            recoveryProvenance: {
              canonicalRecoveryWindowId: "window-room-1",
              physicalGapId: "gap-room-1",
              extractionLocalRegionId: "recovery-room",
              semanticSignature: "high wall bed slanted ladder made rigid and hooked into place on the first night",
              entitySignature: ["first", "hooked", "ladder", "night", "place", "rigid"],
              eventStateType: "event",
            },
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    },
  });
}

async function main() {
  const root = path.resolve(
    readArg("--stabilization-root")
    ?? ".validation/observation-v3/stabilization/stab-05/20260809T123211Z-overlap-governance-hardening",
  );
  const runId = readArg("--run-id") ?? "run-1";
  const runRoot = path.join(root, "runs", runId);

  const currentObsE001 = await readJson(path.join(runRoot, "cases", "OBS-E-001", "pipeline-result.json")) as PipelineResultLike;
  const currentObsH002 = await readJson(path.join(runRoot, "cases", "OBS-H-002", "pipeline-result.json")) as PipelineResultLike;
  const currentObsE001Governance = await readJson(path.join(runRoot, "cases", "OBS-E-001", "stages", "memory_composition", "artifacts", "overlap-governance"));
  const currentObsH002Governance = await readJson(path.join(runRoot, "cases", "OBS-H-002", "stages", "memory_composition", "artifacts", "overlap-governance"));

  const historicalObsE001 = buildHistoricalObsE001Regression();
  const duplicateControl = buildConfirmedDuplicateControl();
  const coexistenceControl = buildCoexistenceControl();

  const artifact = {
    generatedAt: new Date().toISOString(),
    stabilizationRoot: root,
    runId,
    controls: {
      historical_obs_e_001_overlap_regression: {
        composedUnitIds: historicalObsE001.composedUnits.map((unit) => unit.observationId),
        duplicateResolution: historicalObsE001.duplicateAnalysis.duplicateResolution,
        overlapGovernance: historicalObsE001.duplicateAnalysis.overlapGovernance,
        unresolvedOverlaps: historicalObsE001.duplicateAnalysis.unresolvedOverlaps,
        survivingUncertainties: historicalObsE001.composedUnits.map((unit) => ({
          observationId: unit.observationId,
          uncertainty: unit.uncertainty,
        })),
      },
      confirmed_duplicate_control: {
        composedUnitIds: duplicateControl.composedUnits.map((unit) => unit.observationId),
        duplicateResolution: duplicateControl.duplicateAnalysis.duplicateResolution,
        overlapGovernance: duplicateControl.duplicateAnalysis.overlapGovernance,
      },
      coexistence_control: {
        composedUnitIds: coexistenceControl.composedUnits.map((unit) => unit.observationId),
        overlapGovernance: coexistenceControl.duplicateAnalysis.overlapGovernance,
        unresolvedOverlaps: coexistenceControl.duplicateAnalysis.unresolvedOverlaps,
      },
      current_obs_e_001_main: {
        finalOutcome: currentObsE001.summary.finalOutcome,
        supplementalStage: findStage(currentObsE001, "supplemental_realization") ?? null,
        memoryCompositionGovernance: currentObsE001Governance,
      },
      current_obs_h_002_main: {
        finalOutcome: currentObsH002.summary.finalOutcome,
        unresolvedOverlapCount: findStage(currentObsH002, "memory_composition")?.payload?.result?.duplicateAnalysis?.unresolvedOverlaps?.length ?? 0,
        alternativeUncertaintyCount: (
          findStage(currentObsH002, "memory_realization")?.payload?.result?.canonicalCandidate?.uncertaintyRecords ?? []
        ).filter((record) => record.uncertaintyType === "alternative_preserved").length,
        overlapGovernance: currentObsH002Governance,
      },
    },
  };

  const outputPath = path.join(root, "stab-05-evidence.json");
  await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${outputPath}\n`);
}

void main();
