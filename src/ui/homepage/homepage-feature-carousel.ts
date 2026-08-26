export const FEATURE_CAROUSEL_AUTOPLAY_MS = 7_500;

export function getNextFeatureIndex(currentIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return (currentIndex + 1) % total;
}

export function getPreviousFeatureIndex(currentIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return (currentIndex - 1 + total) % total;
}
