import type { OpeningType, OpeningTone } from "@/src/domain/openings/types";

export type OrientationStackView = "new" | "active" | "dormant" | "all";

export interface OrientationOpeningCard {
  id: string;
  title: string;
  tone: OpeningTone;
  kind: OpeningType;
  state: Exclude<OrientationStackView, "all">;
  ctaLabel: string;
  href: string;
}

export function countOpeningsByState(items: OrientationOpeningCard[]): Record<OrientationStackView, number> {
  const counts: Record<OrientationStackView, number> = {
    new: 0,
    active: 0,
    dormant: 0,
    all: items.length,
  };

  for (const item of items) {
    counts[item.state] += 1;
  }

  return counts;
}

export function filterOrientationOpenings(
  items: OrientationOpeningCard[],
  view: OrientationStackView,
): OrientationOpeningCard[] {
  if (view === "all") {
    return items;
  }

  return items.filter((item) => item.state === view);
}
