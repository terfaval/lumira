export type HomepageRouteStatus = "implemented" | "placeholder" | "missing";

export type HomepageNavigationTargetKey =
  | "homepage"
  | "capture_home"
  | "glossary_home"
  | "dream_journal_home"
  | "guide_home"
  | "glossary_term_detail"
  | "dream_orientation"
  | "reflective_object_orientation";

export interface HomepageNavigationTargetRef {
  targetKey: HomepageNavigationTargetKey;
  href: string;
  routeStatus: HomepageRouteStatus;
}

const HOMEPAGE_ROUTE_TARGET_REGISTRY: Record<HomepageNavigationTargetKey, HomepageNavigationTargetRef> = {
  homepage: {
    targetKey: "homepage",
    href: "/",
    routeStatus: "implemented",
  },
  capture_home: {
    targetKey: "capture_home",
    href: "/capture",
    routeStatus: "implemented",
  },
  glossary_home: {
    targetKey: "glossary_home",
    href: "/glossary",
    routeStatus: "placeholder",
  },
  dream_journal_home: {
    targetKey: "dream_journal_home",
    href: "/journal",
    routeStatus: "placeholder",
  },
  guide_home: {
    targetKey: "guide_home",
    href: "/guide",
    routeStatus: "implemented",
  },
  glossary_term_detail: {
    targetKey: "glossary_term_detail",
    href: "/glossary",
    routeStatus: "missing",
  },
  dream_orientation: {
    targetKey: "dream_orientation",
    href: "/objects/[objectId]",
    routeStatus: "placeholder",
  },
  reflective_object_orientation: {
    targetKey: "reflective_object_orientation",
    href: "/objects/[objectId]/reflect",
    routeStatus: "implemented",
  },
};

export function getHomepageRouteTargetRegistry(): Readonly<Record<HomepageNavigationTargetKey, HomepageNavigationTargetRef>> {
  return HOMEPAGE_ROUTE_TARGET_REGISTRY;
}

export function getHomepageRouteTarget(key: HomepageNavigationTargetKey): HomepageNavigationTargetRef {
  return HOMEPAGE_ROUTE_TARGET_REGISTRY[key];
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

export function toDreamOrientationTarget(objectId: string): HomepageNavigationTargetRef {
  const base = getHomepageRouteTarget("dream_orientation");

  return {
    ...base,
    href: `/objects/${encodePathSegment(objectId)}`,
  };
}

export function toReflectiveObjectOrientationTarget(objectId: string): HomepageNavigationTargetRef {
  const base = getHomepageRouteTarget("reflective_object_orientation");

  return {
    ...base,
    href: `/objects/${encodePathSegment(objectId)}/reflect`,
  };
}
