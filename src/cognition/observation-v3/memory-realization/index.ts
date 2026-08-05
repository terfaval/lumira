export * from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";
export { realizeCanonicalMemoryCandidate } from "@/src/cognition/observation-v3/memory-realization/memory-realization";
export { fingerprintMemoryRealization, type MemoryRealizationFingerprintSet } from "@/src/cognition/observation-v3/memory-realization/memory-realization-fingerprint";
export {
  buildShadowComposedCandidateFromV2Bundle,
  buildShadowMemoryRealizationRequest,
  buildMemoryRealizationArtifacts,
  runShadowMemoryRealization,
  compareNativeMemoryRealizationWithLegacyAdapter,
} from "@/src/cognition/observation-v3/memory-realization/shadow-memory-realization";
