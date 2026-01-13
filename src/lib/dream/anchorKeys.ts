const HU_STOP = new Set([
  "a","az","egy","és","vagy","hogy","de","mert","amikor","ahogy","már","még","is","se","sem",
  "ott","itt","oda","ide","innen","onnan","valami","valaki","nagyon","kicsit"
]);

function stripDiacritics(s: string) {
  // optional: kulcshoz jó, megjelenítéshez ne használd
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function anchorKey(raw: string): string {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "";
  const tokens = stripDiacritics(s)
    .split(/[^a-zA-Z0-9áéíóöőúüű]+/g) // maradjon rugalmas
    .map(t => t.trim())
    .filter(t => t.length > 2)
    .filter(t => !HU_STOP.has(t));
  return tokens.join(" ");
}

export function anchorKeys(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    if (typeof x !== "string") continue;
    const k = anchorKey(x);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
