// src/lib/dream/pickNextAnchorKey.ts

function normKey(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

export function pickNextAnchorKey(params: {
  extractAnchorKeys: string[];     // pl legacy_observation_events.system_extract.anchor_keys
  usedAnchorKeys: string[];        // ledger anchor_keys lapítva
}): string | null {
  const all = Array.isArray(params.extractAnchorKeys) ? params.extractAnchorKeys : [];
  const used = new Set(
    (Array.isArray(params.usedAnchorKeys) ? params.usedAnchorKeys : []).map(normKey).filter(Boolean)
  );

  // első unused anchor
  for (const a of all) {
    const k = normKey(a);
    if (!k) continue;
    if (!used.has(k)) return a;
  }
  return null;
}
