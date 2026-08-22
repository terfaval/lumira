import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config({ path: ".env.local" });

import {
  composeDiscoveryInputPacket,
  runHybridDiscoveryPass,
} from "../src/cognition/latent-v2/discovery";
import {
  compareOpportunityConstructors,
  composeExperimentalOpportunityConstructorInput,
  generateExperimentalOpportunityConstructorOutput,
  summarizeOpportunityConstructorComparison,
} from "../src/cognition/latent-v2/experimental-opportunity-constructor";
import {
  composeOpportunityConstructorInputPacket,
  generateOpportunityConstructorOutput,
} from "../src/cognition/latent-v2/opportunity-constructor";
import type { OpportunityConstructorInputPacket } from "../src/cognition/latent-v2/opportunity-constructor";
import { createGlossaryRepository } from "../src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "../src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationNativeStore } from "../src/infrastructure/persistence/observation-store";
import { createObservationV2Repository } from "../src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "../src/infrastructure/supabase/repositories/create-reflective-object-repository";

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data ?? null, null, 2), "utf8");
}

async function main() {
  const priorityReflectiveObjectId = process.argv[2];
  if (!priorityReflectiveObjectId) {
    throw new Error(
      "Usage: npx tsx scripts/dev-run-latent-v2-experimental-comparison.ts <reflective_object_id>",
    );
  }

  const userId = process.env.DEV_USER_ID;
  if (!userId) {
    throw new Error("Missing DEV_USER_ID in environment.");
  }

  const reflectiveObjectRepository = createReflectiveObjectRepository();
  const observationNativeReadRepository = createObservationNativeStore();
  const observationV2Repository = createObservationV2Repository();
  const glossaryRepository = createGlossaryRepository();
  const latentOpportunityRepository = createLatentOpportunityRepository();

  const constructionPacket = await composeOpportunityConstructorInputPacket({
    userId,
    priorityReflectiveObjectId,
    reflectiveObjectRepository,
    observationNativeReadRepository,
    glossaryRepository,
    latentOpportunityRepository,
  });
  if ("authority" in constructionPacket.generationContext) {
    throw new Error("Experimental latent comparison expects default V2 construction packet.");
  }
  const v2ConstructionPacket = constructionPacket as OpportunityConstructorInputPacket;
  const discoveryPacket = await composeDiscoveryInputPacket({
    userId,
    priorityReflectiveObjectId,
    reflectiveObjectRepository,
    observationV2Repository,
  });

  const discoveryResult = await runHybridDiscoveryPass({
    packet: discoveryPacket,
  });

  if (discoveryResult.mode !== "generated") {
    throw new Error(`Discovery failed: ${discoveryResult.reason}`);
  }

  const comparison = await compareOpportunityConstructors({
    constructionPacket: v2ConstructionPacket,
    discoveryResult: discoveryResult.output,
    generateCurrentOutput: ({ packet }) =>
      generateOpportunityConstructorOutput({ packet: packet as OpportunityConstructorInputPacket }),
    generateExperimentalOutput: ({ packet }) =>
      generateExperimentalOpportunityConstructorOutput({ packet }),
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(
    process.cwd(),
    "scripts",
    "output",
    `latent-v2-experimental-comparison-${priorityReflectiveObjectId}-${timestamp}`,
  );

  await fs.mkdir(outputDir, { recursive: true });
  await writeJson(path.join(outputDir, "01-construction-packet.json"), v2ConstructionPacket);
  await writeJson(path.join(outputDir, "02-discovery-output.json"), discoveryResult.output);
  await writeJson(
    path.join(outputDir, "03-experimental-input-packet.json"),
    composeExperimentalOpportunityConstructorInput({
      constructionPacket: v2ConstructionPacket,
      discoveryResult: discoveryResult.output,
    }),
  );
  await writeJson(path.join(outputDir, "04-comparison.json"), comparison);
  await writeJson(path.join(outputDir, "99-summary.json"), {
    mode: comparison.mode,
    summary:
      comparison.mode === "compared"
        ? summarizeOpportunityConstructorComparison(comparison.comparison)
        : `${comparison.stage}:${comparison.reason}`,
    outputDir,
  });

  console.log(`Experimental latent comparison written to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
