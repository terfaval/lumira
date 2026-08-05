import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const OBSERVATION_BENCHMARK_CORPUS_V1_PATH =
  "docs/v2-build/validation-benchmark/Observation-Benchmark-Dream-Corpus-v1.md";

export const OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER = [
  "OBS-A-001",
  "OBS-A-002",
  "OBS-B-001",
  "OBS-B-002",
  "OBS-C-001",
  "OBS-C-002",
  "OBS-C-003",
  "OBS-D-001",
  "OBS-D-002",
  "OBS-E-001",
  "OBS-E-002",
  "OBS-F-001",
  "OBS-F-002",
  "OBS-G-001",
  "OBS-G-002",
  "OBS-H-001",
  "OBS-H-002",
] as const;

interface ParsedLine {
  lineNumber: number;
  text: string;
  startOffset: number;
  contentEndOffset: number;
}

export interface ObservationBenchmarkCorpusItemSourceRange {
  heading: string;
  startLine: number;
  endLine: number;
  dreamTextStartLine: number;
  dreamTextEndLine: number;
}

export interface ParsedObservationBenchmarkCorpusItem {
  benchmarkId: string;
  sourceDate: string;
  benchmarkFamily: string;
  stressTargets: string[];
  secondaryTags: string[];
  expectedEvaluationFocus: string[];
  dreamText: string;
  source: ObservationBenchmarkCorpusItemSourceRange;
}

export interface ParsedObservationBenchmarkCorpus {
  sourcePath: string;
  benchmarkCount: number;
  benchmarkOrder: string[];
  items: ParsedObservationBenchmarkCorpusItem[];
}

interface ParseObservationBenchmarkCorpusContentInput {
  content: string;
  sourcePath: string;
  expectedBenchmarkOrder: readonly string[];
}

interface ParseObservationBenchmarkCorpusFileInput {
  sourcePath: string;
  expectedBenchmarkOrder: readonly string[];
}

interface ParsedFieldBlock {
  nextIndex: number;
  lines: ParsedLine[];
  rawText: string;
}

const BENCHMARK_ENTRIES_HEADING = "# Benchmark Entries";
const BENCHMARK_HEADING_PATTERN = /^## (OBS-[A-H]-\d{3})$/;
const POSSIBLE_BENCHMARK_HEADING_PATTERN = /^## OBS-/;
const LABEL_SOURCE_DATE = "**Source Date**";
const LABEL_BENCHMARK_FAMILY = "**Benchmark Family**";
const LABEL_STRESS_TARGETS = "**Stress Targets**";
const LABEL_SECONDARY_TAGS = "**Secondary Tags**";
const LABEL_EXPECTED_EVALUATION_FOCUS = "**Expected Evaluation Focus**";
const LABEL_DREAM_TEXT = "**Dream Text**";
const ENTRY_DELIMITER = "---";

function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function splitLines(content: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let startOffset = 0;
  let lineNumber = 1;

  while (startOffset < content.length) {
    let contentEndOffset = startOffset;
    while (contentEndOffset < content.length && content[contentEndOffset] !== "\n" && content[contentEndOffset] !== "\r") {
      contentEndOffset += 1;
    }

    let nextOffset = contentEndOffset;
    if (content[nextOffset] === "\r" && content[nextOffset + 1] === "\n") {
      nextOffset += 2;
    } else if (content[nextOffset] === "\r" || content[nextOffset] === "\n") {
      nextOffset += 1;
    }

    lines.push({
      lineNumber,
      text: content.slice(startOffset, contentEndOffset),
      startOffset,
      contentEndOffset,
    });

    startOffset = nextOffset;
    lineNumber += 1;
  }

  return lines;
}

function isBlank(line: ParsedLine | undefined): boolean {
  return !line || line.text.length === 0;
}

function isSectionLabel(line: ParsedLine | undefined): boolean {
  return Boolean(line && /^\*\*.+\*\*$/.test(line.text));
}

function requireLine(lines: ParsedLine[], index: number, message: string): ParsedLine {
  const line = lines[index];
  if (!line) {
    throw new Error(message);
  }

  return line;
}

function skipBlankLines(lines: ParsedLine[], index: number): number {
  let pointer = index;
  while (pointer < lines.length && isBlank(lines[pointer])) {
    pointer += 1;
  }
  return pointer;
}

function findBenchmarkEntriesHeadingIndex(lines: ParsedLine[]): number {
  const headingIndex = lines.findIndex((line) => line.text === BENCHMARK_ENTRIES_HEADING);
  if (headingIndex < 0) {
    throw new Error(`Missing benchmark entries heading "${BENCHMARK_ENTRIES_HEADING}".`);
  }

  return headingIndex;
}

function collectBenchmarkHeadingIndices(lines: ParsedLine[], startIndex: number): number[] {
  const indices: number[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (BENCHMARK_HEADING_PATTERN.test(line.text)) {
      indices.push(index);
      continue;
    }

    if (POSSIBLE_BENCHMARK_HEADING_PATTERN.test(line.text)) {
      throw new Error(`Malformed benchmark heading at line ${line.lineNumber}: ${line.text}`);
    }
  }

  if (indices.length === 0) {
    throw new Error("No benchmark entries found in corpus authority file.");
  }

  return indices;
}

function parseExpectedLabel(lines: ParsedLine[], index: number, label: string): number {
  const pointer = skipBlankLines(lines, index);
  const line = requireLine(lines, pointer, `Expected field "${label}" but reached end of entry.`);

  if (line.text !== label) {
    throw new Error(`Expected field "${label}" at line ${line.lineNumber}, received "${line.text || "(blank)"}".`);
  }

  return pointer + 1;
}

function extractRawText(content: string, lines: ParsedLine[]): string {
  if (lines.length === 0) {
    return "";
  }

  return content.slice(lines[0]!.startOffset, lines.at(-1)!.contentEndOffset);
}

function readFieldBlock(input: {
  content: string;
  lines: ParsedLine[];
  startIndex: number;
  nextLabel: string | null;
  benchmarkId: string;
  fieldName: string;
}): ParsedFieldBlock {
  const firstContentIndex = skipBlankLines(input.lines, input.startIndex);
  const firstContentLine = input.lines[firstContentIndex];
  if (
    !firstContentLine ||
    firstContentLine.text === ENTRY_DELIMITER ||
    BENCHMARK_HEADING_PATTERN.test(firstContentLine.text) ||
    (input.nextLabel !== null && firstContentLine.text === input.nextLabel) ||
    isSectionLabel(firstContentLine)
  ) {
    throw new Error(`Benchmark ${input.benchmarkId} contains empty ${input.fieldName}.`);
  }

  let cursor = firstContentIndex;
  while (cursor < input.lines.length) {
    const line = input.lines[cursor]!;

    if (line.text === ENTRY_DELIMITER || BENCHMARK_HEADING_PATTERN.test(line.text)) {
      break;
    }

    if (input.nextLabel && line.text === input.nextLabel) {
      break;
    }

    if (isSectionLabel(line)) {
      break;
    }

    cursor += 1;
  }

  let lastContentIndex = cursor - 1;
  while (lastContentIndex >= firstContentIndex && isBlank(input.lines[lastContentIndex])) {
    lastContentIndex -= 1;
  }

  if (lastContentIndex < firstContentIndex) {
    throw new Error(`Benchmark ${input.benchmarkId} contains empty field content.`);
  }

  const blockLines = input.lines.slice(firstContentIndex, lastContentIndex + 1);

  return {
    nextIndex: cursor,
    lines: blockLines,
    rawText: extractRawText(input.content, blockLines),
  };
}

function parseBulletList(input: {
  content: string;
  lines: ParsedLine[];
  startIndex: number;
  nextLabel: string;
  benchmarkId: string;
  fieldName: string;
}): ParsedFieldBlock & { values: string[] } {
    const block = readFieldBlock(input);
  const values = block.lines.map((line) => {
    if (!line.text.startsWith("- ")) {
      throw new Error(
        `Benchmark ${input.benchmarkId} has malformed list item in ${input.fieldName} at line ${line.lineNumber}.`,
      );
    }

    return line.text.slice(2);
  });

  if (values.length === 0) {
    throw new Error(`Benchmark ${input.benchmarkId} is missing ${input.fieldName}.`);
  }

  return {
    ...block,
    values,
  };
}

function parseParagraphs(rawText: string): string[] {
  return rawText
    .split(/\r\n\r\n|\n\n|\r\r/u)
    .filter((paragraph) => paragraph.length > 0);
}

function parseBenchmarkEntry(input: {
  content: string;
  lines: ParsedLine[];
  headingIndex: number;
  entryEndIndex: number;
}): ParsedObservationBenchmarkCorpusItem {
  const headingLine = input.lines[input.headingIndex]!;
  const headingMatch = headingLine.text.match(BENCHMARK_HEADING_PATTERN);
  if (!headingMatch) {
    throw new Error(`Malformed benchmark heading at line ${headingLine.lineNumber}: ${headingLine.text}`);
  }

  const benchmarkId = headingMatch[1]!;
  const entryLines = input.lines.slice(input.headingIndex, input.entryEndIndex);

  const delimiterIndex = entryLines.findIndex((line) => line.text === ENTRY_DELIMITER);
  const hasDelimiter = delimiterIndex >= 0;
  const linesBeforeDelimiter = hasDelimiter ? entryLines.slice(0, delimiterIndex) : entryLines;
  const sourceEndLine = hasDelimiter
    ? entryLines[delimiterIndex]!.lineNumber
    : linesBeforeDelimiter.at(-1)?.lineNumber ?? headingLine.lineNumber;

  let cursor = 1;

  cursor = parseExpectedLabel(linesBeforeDelimiter, cursor, LABEL_SOURCE_DATE);
  const sourceDateBlock = readFieldBlock({
    content: input.content,
    lines: linesBeforeDelimiter,
    startIndex: cursor,
    nextLabel: LABEL_BENCHMARK_FAMILY,
    benchmarkId,
    fieldName: "source date",
  });
  cursor = sourceDateBlock.nextIndex;

  cursor = parseExpectedLabel(linesBeforeDelimiter, cursor, LABEL_BENCHMARK_FAMILY);
  const benchmarkFamilyBlock = readFieldBlock({
    content: input.content,
    lines: linesBeforeDelimiter,
    startIndex: cursor,
    nextLabel: LABEL_STRESS_TARGETS,
    benchmarkId,
    fieldName: "benchmark family",
  });
  cursor = benchmarkFamilyBlock.nextIndex;

  cursor = parseExpectedLabel(linesBeforeDelimiter, cursor, LABEL_STRESS_TARGETS);
  const stressTargetsBlock = parseBulletList({
    content: input.content,
    lines: linesBeforeDelimiter,
    startIndex: cursor,
    nextLabel: LABEL_SECONDARY_TAGS,
    benchmarkId,
    fieldName: "stress targets",
  });
  cursor = stressTargetsBlock.nextIndex;

  cursor = parseExpectedLabel(linesBeforeDelimiter, cursor, LABEL_SECONDARY_TAGS);
  const secondaryTagsBlock = parseBulletList({
    content: input.content,
    lines: linesBeforeDelimiter,
    startIndex: cursor,
    nextLabel: LABEL_EXPECTED_EVALUATION_FOCUS,
    benchmarkId,
    fieldName: "secondary tags",
  });
  cursor = secondaryTagsBlock.nextIndex;

  cursor = parseExpectedLabel(linesBeforeDelimiter, cursor, LABEL_EXPECTED_EVALUATION_FOCUS);
  const expectedFocusBlock = readFieldBlock({
    content: input.content,
    lines: linesBeforeDelimiter,
    startIndex: cursor,
    nextLabel: LABEL_DREAM_TEXT,
    benchmarkId,
    fieldName: "expected evaluation focus",
  });
  cursor = expectedFocusBlock.nextIndex;

  cursor = parseExpectedLabel(linesBeforeDelimiter, cursor, LABEL_DREAM_TEXT);
  const dreamTextBlock = readFieldBlock({
    content: input.content,
    lines: linesBeforeDelimiter,
    startIndex: cursor,
    nextLabel: null,
    benchmarkId,
    fieldName: "dream text",
  });
  cursor = dreamTextBlock.nextIndex;

  const trailingIndex = skipBlankLines(linesBeforeDelimiter, cursor);
  if (trailingIndex !== linesBeforeDelimiter.length) {
    const trailingLine = linesBeforeDelimiter[trailingIndex]!;
    throw new Error(`Unparsed trailing benchmark content in ${benchmarkId} at line ${trailingLine.lineNumber}.`);
  }

  return {
    benchmarkId,
    sourceDate: sourceDateBlock.rawText,
    benchmarkFamily: benchmarkFamilyBlock.rawText,
    stressTargets: stressTargetsBlock.values,
    secondaryTags: secondaryTagsBlock.values,
    expectedEvaluationFocus: parseParagraphs(expectedFocusBlock.rawText),
    dreamText: dreamTextBlock.rawText,
    source: {
      heading: benchmarkId,
      startLine: headingLine.lineNumber,
      endLine: sourceEndLine,
      dreamTextStartLine: dreamTextBlock.lines[0]!.lineNumber,
      dreamTextEndLine: dreamTextBlock.lines.at(-1)!.lineNumber,
    },
  };
}

function assertExpectedBenchmarkOrder(parsedOrder: string[], expectedOrder: readonly string[]): void {
  if (parsedOrder.length !== expectedOrder.length) {
    throw new Error(
      `Benchmark count mismatch. Expected ${expectedOrder.length}, received ${parsedOrder.length}.`,
    );
  }

  for (let index = 0; index < expectedOrder.length; index += 1) {
    if (parsedOrder[index] !== expectedOrder[index]) {
      throw new Error(
        `Unexpected benchmark order at position ${index + 1}. Expected ${expectedOrder[index]}, received ${parsedOrder[index] ?? "(missing)"}.`,
      );
    }
  }
}

export function parseObservationBenchmarkCorpusContent(
  input: ParseObservationBenchmarkCorpusContentInput,
): ParsedObservationBenchmarkCorpus {
  const lines = splitLines(input.content);
  const benchmarkEntriesHeadingIndex = findBenchmarkEntriesHeadingIndex(lines);
  const headingIndices = collectBenchmarkHeadingIndices(lines, benchmarkEntriesHeadingIndex + 1);
  const items: ParsedObservationBenchmarkCorpusItem[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < headingIndices.length; index += 1) {
    const headingIndex = headingIndices[index]!;
    const entryEndIndex = index + 1 < headingIndices.length ? headingIndices[index + 1]! : lines.length;
    const item = parseBenchmarkEntry({
      content: input.content,
      lines,
      headingIndex,
      entryEndIndex,
    });

    if (seenIds.has(item.benchmarkId)) {
      throw new Error(`Duplicate benchmark ID detected: ${item.benchmarkId}`);
    }

    seenIds.add(item.benchmarkId);
    items.push(item);
  }

  const lastItem = items.at(-1);
  if (!lastItem) {
    throw new Error("No benchmark entries were parsed.");
  }

  const trailingLines = lines.slice(lastItem.source.endLine).filter((line) => !isBlank(line));
  if (trailingLines.length > 0) {
    throw new Error(`Unparsed trailing benchmark content at line ${trailingLines[0]!.lineNumber}.`);
  }

  const benchmarkOrder = items.map((item) => item.benchmarkId);
  assertExpectedBenchmarkOrder(benchmarkOrder, input.expectedBenchmarkOrder);

  return {
    sourcePath: input.sourcePath,
    benchmarkCount: items.length,
    benchmarkOrder,
    items,
  };
}

export async function parseObservationBenchmarkCorpusFile(
  input: ParseObservationBenchmarkCorpusFileInput,
): Promise<ParsedObservationBenchmarkCorpus> {
  const resolvedSourcePath = path.resolve(input.sourcePath);
  const sourceBuffer = await fs.readFile(resolvedSourcePath);
  const sourceContent = sourceBuffer.toString("utf8");

  return parseObservationBenchmarkCorpusContent({
    content: sourceContent,
    sourcePath: input.sourcePath,
    expectedBenchmarkOrder: input.expectedBenchmarkOrder,
  });
}

export function hashObservationBenchmarkDreamText(dreamText: string): string {
  return sha256Hex(Buffer.from(dreamText, "utf8"));
}

export function hashObservationBenchmarkSourceFile(sourceFile: Buffer): string {
  return sha256Hex(sourceFile);
}

export function countObservationBenchmarkDreamTextBytes(dreamText: string): number {
  return Buffer.byteLength(dreamText, "utf8");
}
