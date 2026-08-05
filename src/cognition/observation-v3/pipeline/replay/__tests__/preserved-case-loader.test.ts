import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  loadPreservedExtractionReplayEvidence,
  loadPreservedSupplementalReplayEvidence,
} from "@/src/cognition/observation-v3/pipeline/replay/preserved-case-loader";

const createdDirectories: string[] = [];

async function makeTempDir(label: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));
  createdDirectories.push(directory);
  return directory;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

afterEach(async () => {
  await Promise.all(createdDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe("preserved case loader", () => {
  it("loads canonical descriptive provider evidence from the attempt directory", async () => {
    const root = await makeTempDir("obs-v3-preserved-loader");
    const attemptDirectory = path.join(root, "attempt-01");

    await writeJson(path.join(attemptDirectory, "attempt-metadata.json"), {
      attemptNumber: 1,
      rawProviderResponsePreserved: false,
    });
    await writeJson(path.join(attemptDirectory, "descriptive-provider-evidence.json"), {
      subsystem: "descriptive_extraction",
      sourceIdentity: "OBS-A-001",
      evidenceLifecycle: "complete",
      attemptIdentity: {
        attemptNumber: 1,
      },
      providerBoundary: {
        sanitizedPayload: {
          outputText: "{\"dreamLanguage\":\"en\",\"scenes\":[]}",
        },
        payloadHash: "payload-hash",
      },
      parsing: {
        structuredOutput: {
          dreamLanguage: "en",
          scenes: [],
        },
        structuredOutputHash: "structured-output-hash",
      },
    });

    const loaded = await loadPreservedExtractionReplayEvidence({
      attemptDirectory,
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        attemptNumber: 1,
        rawProviderResponsePreserved: true,
        providerResult: expect.objectContaining({
          outputText: expect.stringContaining("\"dreamLanguage\":\"en\""),
        }),
      }),
    );
  });

  it("keeps historical roots readable and explicitly not replayable when canonical evidence is absent", async () => {
    const root = await makeTempDir("obs-v3-preserved-loader-legacy");
    const attemptDirectory = path.join(root, "attempt-01");

    await writeJson(path.join(attemptDirectory, "attempt-metadata.json"), {
      attemptNumber: 1,
      rawProviderResponsePreserved: false,
    });

    const loaded = await loadPreservedExtractionReplayEvidence({
      attemptDirectory,
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        attemptNumber: 1,
        rawProviderResponsePreserved: false,
        providerResult: expect.objectContaining({
          outputText: null,
        }),
      }),
    );
  });

  it("loads indexed canonical supplemental provider evidence per target execution", async () => {
    const root = await makeTempDir("obs-v3-preserved-loader-supp");
    const repeatDirectory = path.join(root, "repeat-01");

    await writeJson(path.join(repeatDirectory, "supplemental-provider-evidence-index.json"), [
      {
        requestId: "supp-1",
        targetId: "target-gap-1",
        providerAttemptNumber: 1,
        evidenceArtifactRef: path.join("supplemental-provider-evidence", "target-gap-1-attempt-01.json"),
      },
    ]);
    await writeJson(
      path.join(repeatDirectory, "supplemental-provider-evidence", "target-gap-1-attempt-01.json"),
      {
        subsystem: "supplemental_realization",
        attemptIdentity: {
          targetId: "target-gap-1",
          targetExecutionAttempt: 1,
        },
        providerBoundary: {
          sanitizedPayload: {
            outputText: "{\"regions\":[]}",
          },
        },
        parsing: {
          structuredOutput: {
            regions: [],
          },
        },
      },
    );

    const loaded = await loadPreservedSupplementalReplayEvidence({
      repeatDirectory,
    });

    expect(loaded).toEqual([
      expect.objectContaining({
        physicalGapId: "target-gap-1",
        providerResult: expect.objectContaining({
          outputText: expect.stringContaining("\"regions\":[]"),
        }),
      }),
    ]);
  });

  it("resolves supplemental physical gap identity from preserved recovery-selection lineage when evidence predates physicalGap metadata", async () => {
    const root = await makeTempDir("obs-v3-preserved-loader-supp-lineage");
    const repeatDirectory = path.join(root, "repeat-01");

    await writeJson(path.join(repeatDirectory, "supplemental-provider-evidence-index.json"), [
      {
        requestId: "supp-1",
        targetId: "target-1-gap-001",
        providerAttemptNumber: 1,
        evidenceArtifactRef: path.join("supplemental-provider-evidence", "target-1-gap-001-attempt-01.json"),
      },
    ]);
    await writeJson(path.join(repeatDirectory, "stages", "02-recovery_selection.json"), {
      artifact: {
        canonicalRecoveryWindows: [
          {
            physicalGapId: "gap-001",
            targetId: "target-1-gap-001",
          },
        ],
      },
    });
    await writeJson(
      path.join(repeatDirectory, "supplemental-provider-evidence", "target-1-gap-001-attempt-01.json"),
      {
        subsystem: "supplemental_realization",
        attemptIdentity: {
          targetId: "target-1-gap-001",
          targetExecutionAttempt: 1,
        },
        providerBoundary: {
          sanitizedPayload: {
            outputText: "{\"regions\":[]}",
          },
          providerMetadata: {
            providerStatus: "completed",
          },
        },
        parsing: {
          structuredOutput: {
            regions: [],
          },
        },
      },
    );

    const loaded = await loadPreservedSupplementalReplayEvidence({
      repeatDirectory,
    });

    expect(loaded).toEqual([
      expect.objectContaining({
        physicalGapId: "gap-001",
      }),
    ]);
  });
});
