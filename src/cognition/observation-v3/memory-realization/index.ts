export * from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";
export { realizeCanonicalMemoryCandidate } from "@/src/cognition/observation-v3/memory-realization/memory-realization";
export { fingerprintMemoryRealization, type MemoryRealizationFingerprintSet } from "@/src/cognition/observation-v3/memory-realization/memory-realization-fingerprint";
export {
  buildShadowMemoryRealizationRequest,
  runShadowMemoryRealization,
  compareNativeMemoryRealizationWithLegacyAdapter,
} from "@/src/cognition/observation-v3/memory-realization/shadow-memory-realization";
