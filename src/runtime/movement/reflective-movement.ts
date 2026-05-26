import type { RuntimeMovementHint } from "@/src/runtime/types";

export interface ReflectiveMovementPolicy {
  maxHints: number;
}

export function limitMovementHints(
  hints: RuntimeMovementHint[],
  policy: ReflectiveMovementPolicy,
): RuntimeMovementHint[] {
  return hints.slice(0, policy.maxHints);
}
