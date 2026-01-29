type Napszak = "default" | "morning" | "day" | "evening" | "night";

export type ResolveBackgroundParams = {
  space?: string | null;
  napszak?: Napszak | string | null;
};

type CacheEntry = {
  url: string | null;
  expiresAt: number;
};

const PRESET_ID = "lumira_stone_passage";
const PRESET_VERSION = 0;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2;
const SESSION_CACHE_PREFIX = "bg:resolved:";
const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

function mapNapszakToVariant(napszak?: string | null): string | null {
  switch (napszak) {
    case "morning":
      return "morning";
    case "day":
      return "dawn";
    case "evening":
    case "night":
    case "default":
      return "night";
    default:
      return null;
  }
}

function getCacheKey(space: string | null | undefined, variant: string) {
  return `${SESSION_CACHE_PREFIX}${space ?? "global"}:${variant}`;
}

function readCache(key: string): CacheEntry | null {
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached;
  memoryCache.delete(key);

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= Date.now()) return null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, entry: CacheEntry) {
  memoryCache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore caching failures (e.g. storage disabled).
  }
}

async function fetchSignedUrl(variant: string, space?: string | null, napszak?: string | null) {
  const params = new URLSearchParams({
    preset_id: PRESET_ID,
    version: String(PRESET_VERSION),
    variant,
  });
  if (space) params.set("space", space);
  if (napszak) params.set("napszak", String(napszak));

  const res = await fetch(`/api/background/resolve?${params.toString()}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string | null };
  return data?.url ?? null;
}

export async function resolveBackground({ space, napszak }: ResolveBackgroundParams): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const variant = mapNapszakToVariant(napszak);
  if (!variant) return null;

  const key = getCacheKey(space, variant);
  const cached = readCache(key);
  if (cached) return cached.url;

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      const url = await fetchSignedUrl(variant, space, napszak);
      const expiresAt = Date.now() + SIGNED_URL_TTL_SECONDS * 1000;
      writeCache(key, { url, expiresAt });
      return url;
    } catch {
      const expiresAt = Date.now() + 5 * 60 * 1000;
      writeCache(key, { url: null, expiresAt });
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
