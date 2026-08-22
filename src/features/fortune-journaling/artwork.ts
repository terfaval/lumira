import type { FortuneCard } from "@/src/content/fortune-journaling";

function toArtworkSlug(card: FortuneCard): string {
  return `${card.number.toString().padStart(2, "0")}-${card.id.replaceAll("_", "-")}.png`;
}

export function getFortuneCardArtworkPath(card: FortuneCard): string {
  return `/fortune-journaling/${toArtworkSlug(card)}`;
}
