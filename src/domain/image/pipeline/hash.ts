// src/domain/image/pipeline/hash.ts
// Simple deterministic hash (FNV-1a 32-bit) for seeds + input hashing.

export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619 (with overflow)
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

export function inputHash(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0");
}
