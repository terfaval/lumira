import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config({ path: ".env.local" });

import { generateAnchorsForReflectiveObject } from "../src/runtime/orchestration/generate-anchors-for-reflective-object";

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data ?? null, null, 2), "utf8");
}

async function main() {
  const priorityReflectiveObjectId = process.argv[2];
  if (!priorityReflectiveObjectId) {
    throw new Error("Usage: npx tsx scripts/dev-run-anchor-v1.ts <reflective_object_id>");
  }

  const userId = process.env.DEV_USER_ID;
  if (!userId) {
    throw new Error("Missing DEV_USER_ID in environment.");
  }

  const result = await generateAnchorsForReflectiveObject({
    userId,
    priorityReflectiveObjectId,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(
    process.cwd(),
    "scripts",
    "output",
    `anchor-v1-${priorityReflectiveObjectId}-${timestamp}`,
  );

  await fs.mkdir(outputDir, { recursive: true });

  if ("packet" in result) {
    await writeJson(path.join(outputDir, "00-input-packet.json"), result.packet);
  }

  if ("rawOutput" in result) {
    await writeJson(path.join(outputDir, "01-raw-llm-output.json"), result.rawOutput);
  }

  if ("parsedOutput" in result) {
    await writeJson(path.join(outputDir, "02-parsed-output.json"), result.parsedOutput);
  }

  if ("validatedOutput" in result) {
    await writeJson(path.join(outputDir, "03-validated-output.json"), result.validatedOutput);
  }

  if ("mappedPayload" in result) {
    await writeJson(path.join(outputDir, "04-mapped-create-inputs.json"), result.mappedPayload);
  }

  if ("persistedIdentities" in result) {
    await writeJson(path.join(outputDir, "05-persisted-identities.json"), result.persistedIdentities);
  }

  if ("persistedManifestations" in result) {
    await writeJson(path.join(outputDir, "06-persisted-manifestations.json"), result.persistedManifestations);
  }

  if ("persistedParticipations" in result) {
    await writeJson(path.join(outputDir, "07-persisted-participations.json"), result.persistedParticipations);
  }

  await writeJson(path.join(outputDir, "99-summary.json"), {
    mode: result.mode,
    success: result.success,
    stage: "stage" in result ? result.stage : null,
    reason: "reason" in result ? result.reason : null,
    identitiesCreated: "identitiesCreated" in result ? result.identitiesCreated : 0,
    manifestationsCreated: "manifestationsCreated" in result ? result.manifestationsCreated : 0,
    participationsCreated: "participationsCreated" in result ? result.participationsCreated : 0,
    anchorIds: "anchorIds" in result ? result.anchorIds : [],
    priorityReflectiveObjectId,
    userId,
    outputDir,
  });

  console.log(`Anchor V1 output written to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
