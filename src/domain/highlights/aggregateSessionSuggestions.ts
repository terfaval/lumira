export type HighlightKind =
  | "person"
  | "place"
  | "object"
  | "theme"
  | "action"
  | "feeling"
  | "direction"
  | "other";

export type HighlightSuggestion = {
  suggestion_key: string;
  label: string;
  kind: HighlightKind;
  group: "salient" | "direction";
  source: "frame" | "latent";
  source_ref?: Record<string, unknown> | null;
  why?: string | null;
  slug?: string | null;
};

export function normalizeLabel(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeKind(raw: unknown): HighlightKind {
  const k = String(raw ?? "").trim().toLowerCase();
  switch (k) {
    case "person":
    case "place":
    case "object":
    case "theme":
    case "action":
    case "feeling":
    case "direction":
      return k;
    default:
      return "other";
  }
}

function coercePayload(raw: any): any {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function aggregateSessionSuggestions(params: {
  framePayloads?: unknown[];
  latentPayloads?: unknown[];
  catalogBySlug?: Map<string, { title?: string | null }> | null;
}): HighlightSuggestion[] {
  const framePayloads = Array.isArray(params.framePayloads) ? params.framePayloads : [];
  const latentPayloads = Array.isArray(params.latentPayloads) ? params.latentPayloads : [];
  const catalogBySlug = params.catalogBySlug ?? null;

  const merged = new Map<string, HighlightSuggestion>();

  const addSuggestion = (item: HighlightSuggestion) => {
    const existing = merged.get(item.suggestion_key);
    if (!existing) {
      merged.set(item.suggestion_key, item);
      return;
    }
    if (!existing.why && item.why) existing.why = item.why;
    if (!existing.source_ref && item.source_ref) existing.source_ref = item.source_ref;
  };

  for (const raw of framePayloads) {
    const payload = coercePayload(raw);
    if (!payload || typeof payload !== "object") continue;

    const recommended = Array.isArray((payload as any).recommended_directions)
      ? (payload as any).recommended_directions
      : Array.isArray((payload as any).recommended_slugs)
      ? (payload as any).recommended_slugs.map((slug: string) => ({ slug }))
      : [];

    for (const item of recommended) {
      if (!item) continue;
      const slug = typeof (item as any).slug === "string" ? (item as any).slug.trim() : "";
      if (!slug) continue;
      const label = catalogBySlug?.get(slug)?.title?.trim() || slug;
      const why = typeof (item as any).why === "string" ? (item as any).why : typeof (item as any).reason === "string" ? (item as any).reason : null;
      const suggestion_key = `dir:${slug}`;
      addSuggestion({
        suggestion_key,
        label,
        kind: "direction",
        group: "direction",
        source: "frame",
        source_ref: { origin: "frame.recommended_directions", slug },
        why,
        slug,
      });
    }
  }

  for (const raw of latentPayloads) {
    const payload = coercePayload(raw);
    if (!payload || typeof payload !== "object") continue;

    const salient = Array.isArray((payload as any).salient_elements) ? (payload as any).salient_elements : [];

    for (const item of salient) {
      if (!item) continue;
      const rawKey = typeof (item as any).key === "string" ? (item as any).key.trim() : "";
      const rawLabel = typeof (item as any).label === "string" ? (item as any).label.trim() : "";
      const label = rawLabel || rawKey;
      if (!label) continue;
      const stableKey = rawKey || normalizeLabel(label);
      if (!stableKey) continue;
      const suggestion_key = `salient:${stableKey}`;
      const kind = normalizeKind((item as any).kind);
      addSuggestion({
        suggestion_key,
        label,
        kind,
        group: "salient",
        source: "latent",
        source_ref: { origin: "latent.salient_elements", key: stableKey },
        why: null,
        slug: null,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.group !== b.group) return a.group === "salient" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}
