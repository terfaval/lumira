import { getSleepDreamGuideCardBySlug } from "@/src/content/sleep-dream-guide/search";

export function resolveGuideModalSlug(slug: string | null | undefined): string | null {
  if (!slug) {
    return null;
  }

  return getSleepDreamGuideCardBySlug(slug) ? slug : null;
}

export function buildGuideCardHref(pathname: string, currentSearch: string, slug: string | null): string {
  const search = currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(search);

  if (slug) {
    params.set("card", slug);
  } else {
    params.delete("card");
  }

  const nextSearch = params.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}
