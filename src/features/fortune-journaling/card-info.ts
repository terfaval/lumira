import visualDnaSource from "@/src/content/fortune-journaling/major-arcana-visual-DNA.json";
import type { FortuneCard } from "@/src/content/fortune-journaling";

interface MajorArcanaVisualDnaEntry {
  card: string;
  palette?: {
    protagonist?: {
      hex?: string;
    };
  };
  visualDNA?: {
    palette?: {
      tensionTransform?: {
        hex?: string;
      };
    };
  };
}

interface MajorArcanaVisualDnaSource {
  cards?: MajorArcanaVisualDnaEntry[];
}

export interface FortuneCardInspectInfo {
  archetypePills: string[];
  summary: string;
  possibleReadings: string[];
  tensionTransformHex: string;
}

export const DEFAULT_FORTUNE_TENSION_TRANSFORM_HEX = "#4F526E";

const visualDnaEntries = Array.isArray(visualDnaSource)
  ? (visualDnaSource as MajorArcanaVisualDnaEntry[])
  : ((visualDnaSource as MajorArcanaVisualDnaSource).cards ?? []);

const tensionTransformHexByNameEn = new Map(
  visualDnaEntries.flatMap((entry) => {
    const hex = entry.palette?.protagonist?.hex ?? entry.visualDNA?.palette?.tensionTransform?.hex;

    return typeof hex === "string" && hex.length > 0 ? ([[entry.card, hex]] as const) : [];
  }),
);

export function getFortuneCardInspectInfo(card: FortuneCard): FortuneCardInspectInfo {
  const tensionTransformHex = tensionTransformHexByNameEn.get(card.name_en) ?? DEFAULT_FORTUNE_TENSION_TRANSFORM_HEX;

  return {
    archetypePills: card.archetype
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
    summary: card.summary,
    possibleReadings: [...card.possible_readings],
    tensionTransformHex,
  };
}
