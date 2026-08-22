import { describe, expect, it } from "vitest";

import { resolveObservationCaptureAuthorityMode } from "@/src/runtime/orchestration/resolve-observation-capture-authority-mode";

describe("resolveObservationCaptureAuthorityMode", () => {
  it("defaults to V3 active authority when no capture authority mode is configured", () => {
    expect(
      resolveObservationCaptureAuthorityMode({
        nodeEnv: "test",
        supabaseUrl: null,
        supabaseAnonKey: null,
        supabaseServiceRoleKey: null,
        openAiApiKey: null,
        observationCaptureAuthorityMode: null,
      }),
    ).toEqual({
      mode: "v3",
      observationResolution: "explicit_v3",
    });
  });

  it("selects explicit V3 when the capture authority mode is configured to v3", () => {
    expect(
      resolveObservationCaptureAuthorityMode({
        nodeEnv: "test",
        supabaseUrl: null,
        supabaseAnonKey: null,
        supabaseServiceRoleKey: null,
        openAiApiKey: null,
        observationCaptureAuthorityMode: "v3",
      }),
    ).toEqual({
      mode: "v3",
      observationResolution: "explicit_v3",
    });
  });

  it("rolls subsequent captures back to V2 when the configured mode switches back", () => {
    expect(
      resolveObservationCaptureAuthorityMode({
        nodeEnv: "test",
        supabaseUrl: null,
        supabaseAnonKey: null,
        supabaseServiceRoleKey: null,
        openAiApiKey: null,
        observationCaptureAuthorityMode: "v2",
      }),
    ).toEqual({
      mode: "v2",
      observationResolution: "explicit_v2",
    });
  });

  it("defaults conservatively to V3 active authority for invalid configured values", () => {
    expect(
      resolveObservationCaptureAuthorityMode({
        nodeEnv: "test",
        supabaseUrl: null,
        supabaseAnonKey: null,
        supabaseServiceRoleKey: null,
        openAiApiKey: null,
        observationCaptureAuthorityMode: "invalid",
      }),
    ).toEqual({
      mode: "v3",
      observationResolution: "explicit_v3",
    });
  });
});
