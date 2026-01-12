export const OBSERVATION_SAFETY_FLAGS = ["none", "distress", "reality_confusion", "self_harm"] as const;
export type ObservationSafetyFlag = (typeof OBSERVATION_SAFETY_FLAGS)[number];

export type ObservationItem = { label: string; evidence: string[] };

export type DreamObservation = {
  entities: {
    characters: ObservationItem[];
    places: ObservationItem[];
    objects: ObservationItem[];
    other: ObservationItem[];
  };
  motifs: ObservationItem[];
  tone: ObservationItem[];
  structure: ObservationItem[];
  body: ObservationItem[];
  safety: { flag: ObservationSafetyFlag; evidence: string[] };
};

export type CompactDreamObservation = {
  entities: {
    characters: string[];
    places: string[];
    objects: string[];
    other: string[];
  };
  motifs: string[];
  tone: string[];
  structure: string[];
  body: string[];
  safety: { flag: ObservationSafetyFlag; evidence: string[] };
};

const MAX_ITEMS = 12;
const MAX_EVIDENCE = 4;
const MAX_EVIDENCE_CHARS = 220;

const normalizeText = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

const normalizeEvidence = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .map((item) => (item.length > MAX_EVIDENCE_CHARS ? item.slice(0, MAX_EVIDENCE_CHARS) : item))
    .slice(0, MAX_EVIDENCE);
};

const normalizeItem = (raw: unknown): ObservationItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const label = normalizeText(record.label);
  const evidence = normalizeEvidence(record.evidence);
  if (!label || evidence.length === 0) return null;
  return { label, evidence };
};

const normalizeItems = (raw: unknown, maxItems = MAX_ITEMS): ObservationItem[] | null => {
  if (!Array.isArray(raw)) return null;
  const items: ObservationItem[] = [];
  for (const entry of raw.slice(0, maxItems)) {
    const normalized = normalizeItem(entry);
    if (!normalized) return null;
    items.push(normalized);
  }
  return items;
};

const normalizeLabels = (items: ObservationItem[]): string[] => items.map((item) => item.label);

export const emptyDreamObservation = (): DreamObservation => ({
  entities: { characters: [], places: [], objects: [], other: [] },
  motifs: [],
  tone: [],
  structure: [],
  body: [],
  safety: { flag: "none", evidence: [] },
});

export const parseDreamObservation = (raw: unknown): DreamObservation | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!record.entities || typeof record.entities !== "object") return null;
  const entities = record.entities as Record<string, unknown>;

  const characters = normalizeItems(entities.characters);
  const places = normalizeItems(entities.places);
  const objects = normalizeItems(entities.objects);
  const other = normalizeItems(entities.other);
  const motifs = normalizeItems(record.motifs);
  const tone = normalizeItems(record.tone);
  const structure = normalizeItems(record.structure);
  const body = normalizeItems(record.body);
  if (!characters || !places || !objects || !other || !motifs || !tone || !structure || !body) return null;

  if (!record.safety || typeof record.safety !== "object") return null;
  const safety = record.safety as Record<string, unknown>;
  const flag = typeof safety.flag === "string" ? safety.flag : "";
  if (!OBSERVATION_SAFETY_FLAGS.includes(flag as ObservationSafetyFlag)) return null;
  const evidence = normalizeEvidence(safety.evidence);
  if (flag !== "none" && evidence.length === 0) return null;

  return {
    entities: { characters, places, objects, other },
    motifs,
    tone,
    structure,
    body,
    safety: { flag: flag as ObservationSafetyFlag, evidence },
  };
};

export const compactDreamObservation = (obs: DreamObservation | null): CompactDreamObservation | null => {
  if (!obs) return null;
  return {
    entities: {
      characters: normalizeLabels(obs.entities.characters),
      places: normalizeLabels(obs.entities.places),
      objects: normalizeLabels(obs.entities.objects),
      other: normalizeLabels(obs.entities.other),
    },
    motifs: normalizeLabels(obs.motifs),
    tone: normalizeLabels(obs.tone),
    structure: normalizeLabels(obs.structure),
    body: normalizeLabels(obs.body),
    safety: obs.safety,
  };
};