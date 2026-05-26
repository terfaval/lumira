import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const logDir = resolve(repoRoot, "docs", "build-logs");
const summaryPath = resolve(repoRoot, "docs", "BUILD_LOG.md");

if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const now = new Date();
const iso = now.toISOString();
const compactTimestamp = iso.replace(/[:.]/g, "-");
const runId = `${compactTimestamp}`;
const runLogPath = resolve(logDir, `${runId}.log`);

const command = process.execPath;
const args = [resolve(repoRoot, "node_modules", "next", "dist", "bin", "next"), "build"];

const result = spawnSync(command, args, {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "pipe",
});

const stdout = result.stdout ?? "";
const stderrParts = [result.stderr ?? ""];
if (result.error) {
  stderrParts.push(`spawn_error: ${result.error.message}`);
}
const stderr = stderrParts.filter(Boolean).join("\n");
const exitCode = typeof result.status === "number" ? result.status : 1;
const status = exitCode === 0 ? "success" : "failed";

process.stdout.write(stdout);
process.stderr.write(stderr);

const fullLog = [
  `# Build Run ${runId}`,
  `timestamp: ${iso}`,
  `command: ${command} ${args.join(" ")}`,
  `status: ${status}`,
  `exit_code: ${exitCode}`,
  "",
  "## stdout",
  "```txt",
  stdout.trimEnd(),
  "```",
  "",
  "## stderr",
  "```txt",
  stderr.trimEnd(),
  "```",
  "",
].join("\n");

writeFileSync(runLogPath, fullLog, "utf8");

if (!existsSync(summaryPath)) {
  writeFileSync(
    summaryPath,
    [
      "# Build Log",
      "",
      "Append-only build run summary. Detailed logs are under `docs/build-logs/`.",
      "",
      "| UTC Timestamp | Status | Exit Code | Log File |",
      "| --- | --- | --- | --- |",
      "",
    ].join("\n"),
    "utf8",
  );
}

appendFileSync(
  summaryPath,
  `| ${iso} | ${status} | ${exitCode} | \`docs/build-logs/${runId}.log\` |\n`,
  "utf8",
);

if (exitCode !== 0) {
  process.exit(exitCode);
}
