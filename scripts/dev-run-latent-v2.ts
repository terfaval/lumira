import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config({ path: ".env.local" });

import { generateLatentOpportunitiesForReflectiveObject } from "../src/runtime/orchestration/generate-latent-opportunities-for-reflective-object";

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data ?? null, null, 2), "utf8");
}

async function main() {
  const priorityReflectiveObjectId = process.argv[2];

  if (!priorityReflectiveObjectId) {
    throw new Error(
      "Usage: npx tsx scripts/dev-run-latent-v2.ts <reflective_object_id>",
    );
  }

  const userId = process.env.DEV_USER_ID;

  if (!userId) {
    throw new Error("Missing DEV_USER_ID in environment.");
  }

  const result = await generateLatentOpportunitiesForReflectiveObject({
    userId,
    priorityReflectiveObjectId,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(
    process.cwd(),
    "scripts",
    "output",
    `latent-v2-${priorityReflectiveObjectId}-${timestamp}`,
  );

  await fs.mkdir(outputDir, { recursive: true });

  await writeJson(path.join(outputDir, "00-full-result.json"), result);

  if ("packet" in result) {
    await writeJson(path.join(outputDir, "01-input-packet.json"), result.packet);
  }

  if ("rawOutput" in result) {
    await writeJson(path.join(outputDir, "02-raw-llm-output.json"), result.rawOutput);
  }

  if ("parsedOutput" in result) {
    await writeJson(path.join(outputDir, "03-parsed-output.json"), result.parsedOutput);
  }

  if ("validatedOutput" in result) {
    await writeJson(path.join(outputDir, "04-validated-output.json"), result.validatedOutput);
  }

  if ("mappedPayload" in result) {
    await writeJson(path.join(outputDir, "05-mapped-payload.json"), result.mappedPayload);
  }

  if ("persistedManifestation" in result) {
    await writeJson(
      path.join(outputDir, "06-persisted-manifestation.json"),
      result.persistedManifestation,
    );
  }

  if ("persistedManifestations" in result) {
    await writeJson(
      path.join(outputDir, "06-persisted-manifestations.json"),
      result.persistedManifestations,
    );
  }

  if ("persistedIdentity" in result) {
    await writeJson(
      path.join(outputDir, "07-persisted-identity.json"),
      result.persistedIdentity,
    );
  }

  if ("persistedIdentities" in result) {
    await writeJson(
      path.join(outputDir, "07-persisted-identities.json"),
      result.persistedIdentities,
    );
  }

  await writeJson(path.join(outputDir, "99-summary.json"), {
    mode: result.mode,
    stage: "stage" in result ? result.stage : null,
    reason: "reason" in result ? result.reason : null,
    priorityReflectiveObjectId,
    userId,
    outputDir,
  });

  console.log(`Latent V2 output written to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
