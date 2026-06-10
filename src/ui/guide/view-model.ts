import {
  getSleepDreamGuideCardBySlug,
  getSleepDreamGuideCards,
  type SleepDreamGuideCard,
  searchSleepDreamGuideCards,
} from "@/src/content/sleep-dream-guide/search";

export const GUIDE_ALL_FILTER = "Összes";

export const GUIDE_PRIMARY_FILTERS = [
  "Alvás",
  "Álomemlékezés",
  "Tudatos álmodás",
  "Nehéz álmok",
  "Különleges élmények",
] as const;

export type GuidePrimaryFilter = (typeof GUIDE_PRIMARY_FILTERS)[number] | typeof GUIDE_ALL_FILTER;

interface GuideFilterInput {
  query: string;
  selectedPrimary: GuidePrimaryFilter;
}

function getSearchBaseCards(query: string): SleepDreamGuideCard[] {
  if (!query.trim()) {
    return getSleepDreamGuideCards();
  }

  return searchSleepDreamGuideCards(query);
}

export function getGuideVisibleCards(input: GuideFilterInput): SleepDreamGuideCard[] {
  const baseCards = getSearchBaseCards(input.query);

  return input.selectedPrimary === GUIDE_ALL_FILTER
    ? baseCards
    : baseCards.filter((card) => card.displayTags.primary === input.selectedPrimary);
}

export function getGuideRelatedCards(slug: string): SleepDreamGuideCard[] {
  const currentCard = getSleepDreamGuideCardBySlug(slug);

  if (!currentCard) {
    return [];
  }

  return currentCard.relatedCardSlugs
    .map((relatedSlug) => getSleepDreamGuideCardBySlug(relatedSlug))
    .filter((card): card is SleepDreamGuideCard => Boolean(card && card.slug !== slug));
}

export function getGuideSecondaryPreviewLabel(card: SleepDreamGuideCard): string | null {
  return card.displayTags.secondary[0] ?? null;
}

export function getGuidePrimaryOptions(): GuidePrimaryFilter[] {
  return [GUIDE_ALL_FILTER, ...GUIDE_PRIMARY_FILTERS];
}
