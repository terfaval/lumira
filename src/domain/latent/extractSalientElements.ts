// src/domain/latent/extractSalientElements.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";
import type { SalientElement } from "@/src/domain/latent/updateLatentFromMaterial";

type EvidenceSource = "observation" | "session_index" | "work_ledger";

const MAX_SALIENT = 5;

function normalizeLabel(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
}

function buildEvidence(source: EvidenceSource, path: string): SalientElement["evidence"] {
  return [{ source, path }];
}

function readBucketItems(bucket: unknown, bucketPath: string): Array<{ label: string; path: string }> {
  if (!Array.isArray(bucket)) return [];

  const out: Array<{ label: string; path: string }> = [];
  bucket.forEach((item, idx) => {
    if (typeof item === "string") {
      const label = normalizeLabel(item);
      if (!label) return;
      out.push({ label, path: `${bucketPath}[${idx}]` });
      return;
    }

    if (item && typeof item === "object") {
      const label = normalizeLabel((item as any).label);
      if (!label) return;
      const evidenceRaw = Array.isArray((item as any).evidence) ? (item as any).evidence : [];
      const evidenceIdx = evidenceRaw.findIndex((e: unknown) => typeof e === "string" && String(e).trim());
      const path =
        evidenceIdx >= 0
          ? `${bucketPath}[${idx}].evidence[${evidenceIdx}]`
          : `${bucketPath}[${idx}].label`;
      out.push({ label, path });
    }
  });

  return out;
}

export function extractSalientElements(args: { observation: any | null | undefined }): SalientElement[] {
  const obs = args.observation;
  if (!obs || typeof obs !== "object") return [];

  const entities = (obs as any).entities ?? {};

  const buckets: Array<{ path: string; items: unknown }> = [
    { path: "entities.places", items: (entities as any).places },
    { path: "entities.people", items: (entities as any).people },
    { path: "entities.objects", items: (entities as any).objects },
    { path: "entities.characters", items: (entities as any).characters },
  ];

  const seen = new Set<string>();
  const elements: SalientElement[] = [];

  for (const bucket of buckets) {
    const items = readBucketItems(bucket.items, bucket.path);
    for (const item of items) {
      const key = anchorKey(item.label);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push({
        key,
        label: item.label,
        evidence: buildEvidence("observation", item.path),
      });
      if (elements.length >= MAX_SALIENT) return elements;
    }
  }

  return elements;
}
