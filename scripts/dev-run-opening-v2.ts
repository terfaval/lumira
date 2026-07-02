import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config({ path: ".env.local" });

import type { LatentOpportunityManifestation } from "../src/domain/latent-v2/types";
import { generateOpeningV2CreateInputFromManifestation } from "../src/cognition/openings/opening-v2-constructor";

async function readManifestationsFromPath(inputPath: string): Promise<LatentOpportunityManifestation[]> {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of latent opportunity manifestations.");
  }

  return parsed as LatentOpportunityManifestation[];
}

async function main() {
  const inputPath = process.argv[2];
  const objectLanguage = process.argv[3] ?? "hu";

  if (!inputPath) {
    throw new Error(
      "Usage: npx tsx scripts/dev-run-opening-v2.ts <persisted_manifestations_json_path> [object_language]",
    );
  }

  const manifestations = await readManifestationsFromPath(inputPath);
  const selected = manifestations.slice(0, 3);

  const results = await Promise.all(
    selected.map(async (manifestation) => ({
      manifestationId: manifestation.id,
      summary: manifestation.summary,
      result: await generateOpeningV2CreateInputFromManifestation({
        manifestation,
        objectLanguage,
      }),
    })),
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(
    process.cwd(),
    "scripts",
    "output",
    `opening-v2-samples-${timestamp}.json`,
  );

  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf8");

  console.log(`Opening V2 sample output written to: ${outputPath}`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
