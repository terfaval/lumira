import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildDescriptiveExtractionAttemptIdentity,
  classifyProviderEvidenceCompatibility,
  createDescriptiveExtractionProviderEvidenceCapture,
  createSupplementalRealizationAttemptIdentity,
  persistProviderEvidenceArtifact,
} from "@/src/cognition/observation-v3/provider-evidence";

describe("provider evidence", () => {
  it("builds stable descriptive attempt identities independent of artifact paths and timestamps", () => {
    const first = buildDescriptiveExtractionAttemptIdentity({
      sourceIdentity: "OBS-A-001",
      extractionRequestId: "request-1",
      attemptNumber: 2,
      retryParentAttemptIdentity: "descriptive:OBS-A-001:request-1:attempt-1",
    });

    const second = buildDescriptiveExtractionAttemptIdentity({
      sourceIdentity: "OBS-A-001",
      extractionRequestId: "request-1",
      attemptNumber: 2,
      retryParentAttemptIdentity: "descriptive:OBS-A-001:request-1:attempt-1",
    });

    expect(first).toEqual(second);
    expect(first.identity).toContain("descriptive_extraction");
    expect(first.identity).toContain("request-1");
    expect(first.fingerprint).toHaveLength(64);
  });

  it("builds stable supplemental attempt identities including target and retry lineage", () => {
    const identity = createSupplementalRealizationAttemptIdentity({
      sourceIdentity: "OBS-C-002",
      supplementalRequestId: "supp-1",
      targetId: "target-gap-3",
      targetExecutionAttempt: 2,
      retryParentAttemptIdentity: "supplemental:OBS-C-002:supp-1:target-gap-3:attempt-1",
    });

    expect(identity.identity).toContain("supplemental_realization");
    expect(identity.identity).toContain("target-gap-3");
    expect(identity.targetExecutionAttempt).toBe(2);
    expect(identity.fingerprint).toHaveLength(64);
  });

  it("captures provider boundary and parsing as separate first-class hashes", () => {
    const capture = createDescriptiveExtractionProviderEvidenceCapture({
      sourceIdentity: "OBS-A-001",
      sourceHash: "source-hash",
      extractionRequestId: "request-1",
      attemptNumber: 1,
      request: {
        requestFingerprint: "request-fingerprint",
        promptFingerprint: "prompt-fingerprint",
        schemaFingerprint: "schema-fingerprint",
        modelIdentifier: "gpt-4.1-mini",
      },
      sanitizationVersion: "san-v1",
      parserFingerprint: "parser-v1",
      parserSchemaFingerprint: "schema-fingerprint",
      artifactVersion: "1",
    });

    const afterProvider = capture.captureProviderBoundary({
      status: "completed",
      incompleteReason: null,
      sanitizedPayload: {
        id: "provider-response-1",
        output_text: "{\"dreamLanguage\":\"en\",\"scenes\":[]}",
      },
      tokenUsage: {
        input: 11,
        output: 22,
        total: 33,
      },
      latencyMs: 1200,
      providerMetadata: {
        provider: "openai",
        responseIdentifier: "resp-1",
      },
      occurredAt: "2026-08-02T12:00:00.000Z",
    });

    const completed = capture.captureParsing({
      status: "parsed",
      structuredOutput: {
        dreamLanguage: "en",
        scenes: [],
      },
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: true,
    });

    expect(afterProvider.evidenceLifecycle).toBe("provider_boundary_captured");
    expect(completed.evidenceLifecycle).toBe("complete");
    expect(completed.providerBoundary.payloadHash).toHaveLength(64);
    expect(completed.parsing.structuredOutputHash).toHaveLength(64);
    expect(completed.providerBoundary.payloadHash).not.toBe(completed.parsing.structuredOutputHash);
  });

  it("records parse failure evidence without fabricating parsed output", () => {
    const capture = createDescriptiveExtractionProviderEvidenceCapture({
      sourceIdentity: "OBS-D-001",
      sourceHash: "source-hash",
      extractionRequestId: "request-2",
      attemptNumber: 1,
      request: {
        requestFingerprint: "request-fingerprint",
        promptFingerprint: "prompt-fingerprint",
        schemaFingerprint: "schema-fingerprint",
        modelIdentifier: "gpt-4.1-mini",
      },
      sanitizationVersion: "san-v1",
      parserFingerprint: "parser-v1",
      parserSchemaFingerprint: "schema-fingerprint",
      artifactVersion: "1",
    });

    capture.captureProviderBoundary({
      status: "completed",
      incompleteReason: null,
      sanitizedPayload: {
        output_text: "{invalid",
      },
      tokenUsage: null,
      latencyMs: 900,
      providerMetadata: {
        provider: "openai",
      },
      occurredAt: "2026-08-02T12:01:00.000Z",
    });

    const completed = capture.captureParsing({
      status: "parse_failed",
      structuredOutput: null,
      failure: {
        message: "Unexpected token i",
      },
      parseFailureClass: "invalid_json",
      producedDirectlyFromProviderPayload: true,
    });

    expect(completed.evidenceLifecycle).toBe("complete");
    expect(completed.parsing.status).toBe("parse_failed");
    expect(completed.parsing.structuredOutput).toBeNull();
    expect(completed.parsing.structuredOutputHash).toBeNull();
    expect(completed.parsing.failure).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("Unexpected token"),
      }),
    );
  });

  it("classifies compatibility mismatches explicitly", () => {
    const compatibility = classifyProviderEvidenceCompatibility({
      replayMode: "dual_validation",
      sourceIdentityMatches: true,
      attemptIdentityMatches: true,
      evidenceSchemaCompatible: true,
      sanitizationCompatible: true,
      parserFingerprintMatches: false,
      parserSchemaFingerprintMatches: true,
      providerPayloadHashMatches: true,
      parsedOutputHashMatches: false,
      reparsedComparisonAvailable: true,
    });

    expect(compatibility.replayMode).toBe("dual_validation");
    expect(compatibility.state).toBe("parsed_output_hash_mismatch");
    expect(compatibility.replayable).toBe(false);
  });

  it("writes evidence atomically and emits a verified receipt", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "provider-evidence-"));
    const destination = path.join(tempDir, "descriptive-provider-evidence.json");

    const capture = createDescriptiveExtractionProviderEvidenceCapture({
      sourceIdentity: "OBS-A-002",
      sourceHash: "source-hash",
      extractionRequestId: "request-3",
      attemptNumber: 1,
      request: {
        requestFingerprint: "request-fingerprint",
        promptFingerprint: "prompt-fingerprint",
        schemaFingerprint: "schema-fingerprint",
        modelIdentifier: "gpt-4.1-mini",
      },
      sanitizationVersion: "san-v1",
      parserFingerprint: "parser-v1",
      parserSchemaFingerprint: "schema-fingerprint",
      artifactVersion: "1",
    });

    capture.captureProviderBoundary({
      status: "completed",
      incompleteReason: null,
      sanitizedPayload: {
        output_text: "{\"dreamLanguage\":\"en\",\"scenes\":[]}",
      },
      tokenUsage: null,
      latencyMs: 500,
      providerMetadata: {
        provider: "openai",
      },
      occurredAt: "2026-08-02T12:02:00.000Z",
    });

    const evidence = capture.captureParsing({
      status: "parsed",
      structuredOutput: {
        dreamLanguage: "en",
        scenes: [],
      },
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: true,
    });

    const persisted = await persistProviderEvidenceArtifact({
      destinationPath: destination,
      evidence,
    });

    expect(JSON.parse(await fs.readFile(destination, "utf8"))).toEqual(evidence);
    expect(persisted.receipt.status).toBe("written");
    expect(persisted.receipt.expectedHash).toBe(persisted.receipt.observedHash);
    expect(persisted.receipt.destination).toBe(destination);
    await expect(fs.access(`${destination}.tmp`)).rejects.toThrow();
  });
});
