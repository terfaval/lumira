const manifestModule = await import(
  new URL(
    "../src/cognition/observation/benchmark/observation-benchmark-corpus-manifest.ts",
    import.meta.url,
  )
);
const parserModule = await import(
  new URL(
    "../src/cognition/observation/benchmark/observation-benchmark-corpus-parser.ts",
    import.meta.url,
  )
);

const {
  OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
  checkObservationBenchmarkCorpusManifest,
  writeObservationBenchmarkCorpusManifest,
} = manifestModule;
const { OBSERVATION_BENCHMARK_CORPUS_V1_PATH } = parserModule;

function readCheckMode() {
  return process.argv.slice(2).includes("--check");
}

async function main() {
  const checkMode = readCheckMode();

  if (checkMode) {
    const result = await checkObservationBenchmarkCorpusManifest({
      sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
      manifestPath: OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
    });

    console.log(
      `Observation benchmark manifest is current: ${result.benchmarkCount} items at ${OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH}`,
    );
    return;
  }

  const result = await writeObservationBenchmarkCorpusManifest({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    manifestPath: OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
  });

  console.log(
    `Observation benchmark manifest generated: ${result.benchmarkCount} items written to ${result.outputPath}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Observation benchmark manifest generation failed: ${message}`);
  process.exit(1);
});
