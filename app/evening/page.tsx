"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { EveningCardCatalogItem } from "@/src/lib/types";
import { EveningCardTile } from "@/components/EveningCardTile";
import { EveningCardFlip } from "@/components/EveningCardFlip";
import { registerListener } from "@/src/lib/perfDebug";

type PhaseKey = "prep" | "in_bed" | "rescue";
const PHASE_LABEL: Record<PhaseKey, string> = {
  prep: "Előkészítés",
  in_bed: "Elalvás előtt",
  rescue: "Éjjeli mentés",
};

type IntentKey =
  | "emlekezet"
  | "tudatossag"
  | "lecsendesites"
  | "biztonsag"
  | "kreativ_inkubacio"
  | "irany_es_jelentes"
  | "test_es_jelenlet";

const INTENT_LABEL: Record<IntentKey, string> = {
  lecsendesites: "Lecsengés",
  biztonsag: "Biztonság",
  emlekezet: "Emlékezet",
  tudatossag: "Tudatosság",
  kreativ_inkubacio: "Inkubáció",
  irany_es_jelentes: "Irány / Jelentés",
  test_es_jelenlet: "Test / Jelenlét",
};

type TimeFilterKey = "all" | "t1" | "t2" | "t3" | "t5" | "t5plus";
const TIME_LABEL: Record<Exclude<TimeFilterKey, "all">, string> = {
  t1: "≤ 1 perc",
  t2: "≤ 2 perc",
  t3: "≤ 3 perc",
  t5: "≤ 5 perc",
  t5plus: "> 5 perc",
};

type SortMode = "recommended" | "title_asc" | "title_desc" | "time_asc" | "time_desc";
type FilterFacet = "phase" | "intent" | "time";
const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "recommended", label: "Ajánlott" },
  { value: "title_asc", label: "Cím A-Z" },
  { value: "title_desc", label: "Cím Z-A" },
  { value: "time_asc", label: "Idő (rövid elől)" },
  { value: "time_desc", label: "Idő (hosszú elől)" },
];

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function getPhase(card: EveningCardCatalogItem): PhaseKey | null {
  const p = (card?.content as any)?.phase;
  const allowed = new Set<PhaseKey>(["prep", "in_bed", "rescue"]);
  return typeof p === "string" && allowed.has(p as PhaseKey) ? (p as PhaseKey) : null;
}

function getIntents(card: EveningCardCatalogItem): IntentKey[] {
  const intents = (card?.content as any)?.intents;
  const allowed = new Set<IntentKey>([
    "emlekezet",
    "tudatossag",
    "lecsendesites",
    "biztonsag",
    "kreativ_inkubacio",
    "irany_es_jelentes",
    "test_es_jelenlet",
  ]);
  if (!Array.isArray(intents)) return [];
  return intents.filter((x): x is IntentKey => typeof x === "string" && allowed.has(x as IntentKey));
}

/** Determinisztikus shuffle (UI stabilitás) */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Token mapping (tile + flip headerhez) */
function intentToken(intent: IntentKey | null) {
  if (!intent) return null;
  return { text: `--intent-${intent}` as const, bg: `--intent-${intent}-bg` as const };
}
function phaseToken(phase: PhaseKey | null) {
  if (!phase) return null;
  return { text: `--phase-${phase}` as const, bg: `--phase-${phase}-bg` as const };
}

/** Tag HU */
export const TAG_HU: Record<string, string> = {
  mental_offload: "Fej kiürítése",
  downshift: "Lecsengés",
  sleep_onset: "Elalvás",
  night_waking: "Visszaalvás",
  dream_recall: "Álomemlékezet",
  lucid_seed: "Lucid nyitás",
  nightmare_relief: "Rémálom-relax",
  emotion_settle: "Érzelmi lecsendesítés",
  body_release: "Testi oldás",
  safety_settle: "Biztonságérzet",
  meaning_seed: "Jelentés hangolás",
  learning_settle: "Tanulás ülepedése",
  creativity_seed: "Kreatív nyitás",
  habit_seed: "Szokás indítása",
  day_close: "Napi lezárás",
  writing: "Írás",
  breath: "Légzés",
  body: "Testérzet",
  imagery: "Képzelet",
  phrase: "Belső mondat",
  review: "Visszatekintés",
  planning: "Finom tervezés",
  setup: "Előkészítés",
};
function huTag(t: string): string {
  return TAG_HU[t] ?? t;
}
function normalizeTagKey(t: string) {
  return (t ?? "").trim().toLowerCase();
}

/** Idő parse -> max minutes */
function parseMaxMinutes(raw?: string): number | null {
  const s = (raw ?? "").toLowerCase();

  const secMatches = [...s.matchAll(/(\d+)\s*[–-]\s*(\d+)\s*(mp|másodperc)/g)];
  if (secMatches.length) {
    const maxSec = Math.max(...secMatches.map((m) => Number(m[2] ?? 0)));
    if (Number.isFinite(maxSec) && maxSec > 0) return maxSec / 60;
  }

  const minMatches = [...s.matchAll(/(\d+)\s*[–-]\s*(\d+)\s*perc/g)];
  if (minMatches.length) {
    const maxMin = Math.max(...minMatches.map((m) => Number(m[2] ?? 0)));
    if (Number.isFinite(maxMin) && maxMin > 0) return maxMin;
  }

  const singleMin = s.match(/(\d+)\s*perc/);
  if (singleMin?.[1]) {
    const v = Number(singleMin[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }

  const singleSec = s.match(/(\d+)\s*(mp|másodperc)/);
  if (singleSec?.[1]) {
    const v = Number(singleSec[1]);
    if (Number.isFinite(v) && v > 0) return v / 60;
  }

  return null;
}
function timeBucket(raw?: string): TimeFilterKey | null {
  const maxMin = parseMaxMinutes(raw);
  if (maxMin == null) return null;
  if (maxMin <= 1.01) return "t1";
  if (maxMin <= 2.01) return "t2";
  if (maxMin <= 3.01) return "t3";
  if (maxMin <= 5.01) return "t5";
  return "t5plus";
}

export default function EveningLanding() {
  const { loading } = useRequireAuth();
  const [cards, setCards] = useState<EveningCardCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [selectedPhase, setSelectedPhase] = useState<PhaseKey | "all">("all");
  const [selectedIntent, setSelectedIntent] = useState<IntentKey | "all">("all");
  const [selectedTime, setSelectedTime] = useState<TimeFilterKey>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeFacet, setActiveFacet] = useState<FilterFacet>("phase");

  // overlay
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // grow-from-tile
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [opening, setOpening] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const seedRef = useRef<number>(0);
  if (!seedRef.current) seedRef.current = Math.floor(Date.now() % 2147483647);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, is_active, content, tags, sort_order, version")
        .eq("is_active", true);

      if (error) setErr(error.message);
      else setCards((data ?? []) as EveningCardCatalogItem[]);
    })();
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!toolbarRef.current) return;
      if (!toolbarRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setSortOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // lock scroll while open
  useEffect(() => {
    if (!openSlug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openSlug]);

  // ESC + focus
  useEffect(() => {
    if (!openSlug) return;

    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeOverlay();
        return;
      }
    }

    const release = registerListener("document.keydown:EveningOverlay");
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlug]);

  const allPhasesInData = useMemo(() => {
    const s = new Set<PhaseKey>();
    for (const c of cards) {
      const p = getPhase(c);
      if (p) s.add(p);
    }
    const order: PhaseKey[] = ["prep", "in_bed", "rescue"];
    return order.filter((k) => s.has(k));
  }, [cards]);

  const allIntentsInData = useMemo(() => {
    const s = new Set<IntentKey>();
    for (const c of cards) for (const i of getIntents(c)) s.add(i);
    const order: IntentKey[] = [
      "lecsendesites",
      "biztonsag",
      "emlekezet",
      "tudatossag",
      "kreativ_inkubacio",
      "irany_es_jelentes",
      "test_es_jelenlet",
    ];
    return order.filter((k) => s.has(k));
  }, [cards]);

  const allTimeBucketsInData = useMemo(() => {
    const s = new Set<Exclude<TimeFilterKey, "all">>();
    for (const c of cards) {
      const m = (c.content as any)?.meta as { time?: string } | undefined;
      const b = timeBucket(m?.time);
      if (b && b !== "all") s.add(b);
    }
    const order: Exclude<TimeFilterKey, "all">[] = ["t1", "t2", "t3", "t5", "t5plus"];
    return order.filter((k) => s.has(k));
  }, [cards]);

  const filteredCards = useMemo(() => {
    let out = cards;
    if (selectedPhase !== "all") out = out.filter((c) => getPhase(c) === selectedPhase);
    if (selectedIntent !== "all") out = out.filter((c) => getIntents(c).includes(selectedIntent));

    if (selectedTime !== "all") {
      out = out.filter((c) => {
        const m = (c.content as any)?.meta as { time?: string } | undefined;
        return timeBucket(m?.time) === selectedTime;
      });
    }

    return out;
  }, [cards, selectedPhase, selectedIntent, selectedTime]);

  const orderedCards = useMemo(() => {
    if (sortMode === "recommended") {
      const hour = new Date().getHours();
      const isNight = hour >= 0 && hour <= 6;

      const rescue = filteredCards.filter((c) => getPhase(c) === "rescue");
      const other = filteredCards.filter((c) => getPhase(c) !== "rescue");

      const otherShuffled = shuffleDeterministic(other, seedRef.current);
      const rescueShuffled = shuffleDeterministic(rescue, seedRef.current ^ 1337);

      return isNight ? [...rescueShuffled, ...otherShuffled] : [...otherShuffled, ...rescueShuffled];
    }

    const byTitle = (a: EveningCardCatalogItem, b: EveningCardCatalogItem) =>
      String(a.title ?? "").localeCompare(String(b.title ?? ""), "hu");

    const byTime = (a: EveningCardCatalogItem, b: EveningCardCatalogItem) => {
      const aTime = parseMaxMinutes((a.content as any)?.meta?.time);
      const bTime = parseMaxMinutes((b.content as any)?.meta?.time);
      if (aTime == null && bTime == null) return byTitle(a, b);
      if (aTime == null) return 1;
      if (bTime == null) return -1;
      return aTime - bTime;
    };

    const sorted = [...filteredCards];
    if (sortMode === "title_asc") sorted.sort(byTitle);
    if (sortMode === "title_desc") sorted.sort((a, b) => byTitle(b, a));
    if (sortMode === "time_asc") sorted.sort(byTime);
    if (sortMode === "time_desc") sorted.sort((a, b) => byTime(b, a));
    return sorted;
  }, [filteredCards, sortMode]);

  const openCard = useMemo(() => {
    return openSlug ? cards.find((c) => c.slug === openSlug) ?? null : null;
  }, [openSlug, cards]);

  const activeFilterCount =
    (selectedPhase !== "all" ? 1 : 0) + (selectedIntent !== "all" ? 1 : 0) + (selectedTime !== "all" ? 1 : 0);

  function computeGrowStyle(rect: DOMRect | null, isOpening: boolean): React.CSSProperties {
    if (typeof window === "undefined") return {};

    const targetW = Math.min(860, window.innerWidth - 32);
    const targetH = Math.min(900, Math.floor(window.innerHeight * 0.86));
    const targetLeft = (window.innerWidth - targetW) / 2;
    const targetTop = (window.innerHeight - targetH) / 2;

    if (!rect) {
      return {
        transform: isOpening ? "scale(0.98) translateY(8px)" : "scale(1) translateY(0)",
        opacity: isOpening ? 0.75 : 1,
      };
    }

    const fromCX = rect.left + rect.width / 2;
    const fromCY = rect.top + rect.height / 2;
    const toCX = targetLeft + targetW / 2;
    const toCY = targetTop + targetH / 2;

    const dx = fromCX - toCX;
    const dy = fromCY - toCY;

    const sx = Math.max(0.06, rect.width / targetW);
    const sy = Math.max(0.06, rect.height / targetH);
    const s = Math.min(sx, sy);

    if (isOpening) {
      return {
        transform: `translate(${dx}px, ${dy}px) scale(${s})`,
        opacity: 0.6,
      };
    }

    return { transform: "translate(0px, 0px) scale(1)", opacity: 1 };
  }

  function openOverlay(slug: string, rect?: DOMRect) {
    setErr(null);
    setOriginRect(rect ?? null);
    setOpenSlug(slug);

    setOpening(true);
    requestAnimationFrame(() => setOpening(false));
  }

  function closeOverlay() {
    setOpenSlug(null);
    setOriginRect(null);
    setOpening(false);
    setFinishing(false);
    setErr(null);
  }

  async function saveUsage() {
    if (!openCard) return;

    setFinishing(true);
    setErr(null);

    try {
      const userId = await requireUserId();
      const contentMeta = (openCard.content as any)?.meta;
      const version = openCard.version ?? contentMeta?.version ?? null;

      const { error } = await supabase.from("evening_card_usage_log").insert({
        user_id: userId,
        card_slug: openCard.slug,
        version,
      });

      if (error) throw error;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Nem sikerült menteni a befejezést.";
      setErr(message);
      throw e;
    } finally {
      setFinishing(false);
    }
  }

  function renderCardTile(c: EveningCardCatalogItem) {
    const rawTags = (((c as any)?.tags ?? []) as string[]).map(normalizeTagKey).filter(Boolean);
    const tags = rawTags.slice(0, 2);

    return (
      <EveningCardTile
        key={c.slug}
        card={c}
        phaseLabel={PHASE_LABEL}
        intentLabel={INTENT_LABEL}
        getPhase={getPhase}
        getIntents={getIntents}
        intentToken={intentToken}
        phaseToken={phaseToken}
        tags={tags}
        huTag={huTag}
        onOpen={openOverlay}
      />
    );
  }

  return (
    <Shell
      title="Álom előkészítő gyakorlatok"
      space="evening"
      surface="none"
      headerActions={
        <button
          type="button"
          className="icon-btn"
          aria-label="Infó"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          <InfoIcon />
        </button>
      }
      infoOpen={infoOpen}
      onToggleInfo={() => setInfoOpen((v) => !v)}
      infoPanel={
        <div className="stack-tight">
          <p style={{ color: "var(--text-muted)" }}>
            Ezek rövid, kíméletes gyakorlatok az elalvás előtti átmenethez, valamint azokra az éjszakai pillanatokra,
            amikor túl éberen ébredsz és nehezedre esik visszaaludni.
          </p>

          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <li>Az egyes fázisok és szándékok segítségével könnyebben tudsz választani,</li>
            <li>hogy megtaláld az alkalomhoz és a céljaidhoz leginkább megfelelő gyakorlatot</li>
            <li>Nyisd meg a kártyát, és csak annyit csinálj, amennyi ma belefér.</li>
            <li>Ha bármelyik gyakorlat élénkít vagy feszít, válts egyszerűbb, test- vagy légzésfókuszú kártyára.</li>
          </ul>
        </div>
      }
    >
      {loading ? (
        <FullScreenLoadingOverlay open />
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          <div className="toolbar" ref={toolbarRef}>
            <div className="toolbar-actions">
              <button
                type="button"
                className="toolbar-btn"
                aria-expanded={filterOpen}
                onClick={() => {
                  setFilterOpen((v) => !v);
                  setSortOpen(false);
                }}
              >
                Szűrés{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
              <button
                type="button"
                className="toolbar-btn"
                aria-expanded={sortOpen}
                onClick={() => {
                  setSortOpen((v) => !v);
                  setFilterOpen(false);
                }}
              >
                Rendezés
              </button>
            </div>

            {filterOpen && (
              <div className="toolbar-panel" role="dialog" aria-label="Szűrés">
                <div className="panel-body">
                  <div className="panel-list">
                    <button
                      type="button"
                      className={`panel-option${activeFacet === "phase" ? " is-active" : ""}`}
                      onClick={() => setActiveFacet("phase")}
                    >
                      Fázis
                    </button>
                    <button
                      type="button"
                      className={`panel-option${activeFacet === "intent" ? " is-active" : ""}`}
                      onClick={() => setActiveFacet("intent")}
                    >
                      Szándék
                    </button>
                    <button
                      type="button"
                      className={`panel-option${activeFacet === "time" ? " is-active" : ""}`}
                      onClick={() => setActiveFacet("time")}
                    >
                      Idő
                    </button>
                  </div>

                  <div className="panel-pills">
                    {activeFacet === "phase" && (
                      <>
                        <button
                          type="button"
                          className={`pill pill--neutral pill-btn${selectedPhase === "all" ? " is-active" : ""}`}
                          aria-pressed={selectedPhase === "all"}
                          onClick={() => setSelectedPhase("all")}
                        >
                          Mind
                        </button>
                        {allPhasesInData.map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`pill pill--neutral pill-btn${selectedPhase === k ? " is-active" : ""}`}
                            aria-pressed={selectedPhase === k}
                            onClick={() => setSelectedPhase(k)}
                          >
                            {PHASE_LABEL[k]}
                          </button>
                        ))}
                      </>
                    )}

                    {activeFacet === "intent" && (
                      <>
                        <button
                          type="button"
                          className={`pill pill--neutral pill-btn${selectedIntent === "all" ? " is-active" : ""}`}
                          aria-pressed={selectedIntent === "all"}
                          onClick={() => setSelectedIntent("all")}
                        >
                          Mind
                        </button>
                        {allIntentsInData.map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`pill pill--neutral pill-btn${selectedIntent === k ? " is-active" : ""}`}
                            aria-pressed={selectedIntent === k}
                            onClick={() => setSelectedIntent(k)}
                          >
                            {INTENT_LABEL[k]}
                          </button>
                        ))}
                      </>
                    )}

                    {activeFacet === "time" && (
                      <>
                        <button
                          type="button"
                          className={`pill pill--neutral pill-btn${selectedTime === "all" ? " is-active" : ""}`}
                          aria-pressed={selectedTime === "all"}
                          onClick={() => setSelectedTime("all")}
                        >
                          Bármennyi
                        </button>
                        {allTimeBucketsInData.map((k) => (
                          <button
                            key={k}
                            type="button"
                            className={`pill pill--neutral pill-btn${selectedTime === k ? " is-active" : ""}`}
                            aria-pressed={selectedTime === k}
                            onClick={() => setSelectedTime(k)}
                          >
                            {TIME_LABEL[k]}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="panel-reset"
                    onClick={() => {
                      setSelectedPhase("all");
                      setSelectedIntent("all");
                      setSelectedTime("all");
                    }}
                  >
                    Visszaállítás
                  </button>
                </div>
              </div>
            )}

            {sortOpen && (
              <div className="toolbar-panel" role="dialog" aria-label="Rendezés">
                <div className="panel-pills panel-pills--column">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pill pill--neutral pill-btn${sortMode === opt.value ? " is-active" : ""}`}
                      aria-pressed={sortMode === opt.value}
                      onClick={() => setSortMode(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="evening-grid">{orderedCards.map((c) => renderCardTile(c))}</div>

          <FullScreenLoadingOverlay open={Boolean(openSlug && !openCard)} />

          {openSlug && openCard && (
            <div
              className="flip-overlay"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeOverlay();
              }}
            >
              {/* ✅ X a kártyán kívül, nem blur-ös shell head */}
              <button
                className="flip-x"
                aria-label="Bezárás"
                onClick={closeOverlay}
                ref={closeBtnRef}
                type="button"
              >
                ×
              </button>

              <div className="flip-shell" style={computeGrowStyle(originRect, opening)}>
                <EveningCardFlip
                  card={openCard}
                  phaseLabel={PHASE_LABEL}
                  intentLabel={INTENT_LABEL}
                  getPhase={getPhase}
                  getIntents={getIntents}
                  intentToken={intentToken}
                  phaseToken={phaseToken}
                  huTag={huTag}
                  onClose={closeOverlay}
                  onSave={saveUsage}
                  saving={finishing}
                  error={err}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .toolbar {
          position: relative;
          display: flex;
          justify-content: flex-end;
          margin: var(--space-1) 0;
          z-index: 2;
        }

        .toolbar-actions {
          display: inline-flex;
          gap: var(--space-2);
          align-items: center;
        }

        .toolbar-btn {
          height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          font-weight: 700;
          letter-spacing: -0.01em;
          cursor: pointer;
        }

        .toolbar-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .toolbar-panel {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 260px;
          max-width: min(520px, 90vw);
          padding: var(--space-3);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(8, 12, 18, 0.92);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          display: grid;
          gap: var(--space-2);
        }

        .panel-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .panel-body {
          display: grid;
          gap: var(--space-2);
          grid-template-columns: 140px 1fr;
          align-items: start;
        }

        .panel-list {
          display: grid;
          gap: 8px;
        }

        .panel-option {
          text-align: left;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.78);
          font-weight: 600;
          cursor: pointer;
        }

        .panel-option.is-active {
          border-color: rgba(255, 255, 255, 0.4);
          color: rgba(255, 255, 255, 0.96);
          background: rgba(255, 255, 255, 0.14);
        }

        .panel-pills {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .panel-pills--column {
          flex-direction: column;
          align-items: flex-start;
        }

        .pill-btn {
          cursor: pointer;
          border: 2px solid currentColor;
        }

        .pill-btn.is-active {
          color: var(--accent);
          border-color: var(--accent);
          background: rgba(255, 255, 255, 0.16);
        }

        .panel-actions {
          display: flex;
          justify-content: flex-end;
        }

        .panel-reset {
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          font-weight: 700;
          cursor: pointer;
        }

        .panel-reset:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .evening-grid {
          display: grid;
          gap: var(--space-4);
          grid-template-columns: repeat(1, minmax(0, 1fr));
          margin-top: 6px;
        }
        @media (min-width: 860px) {
          .evening-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .flip-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-3);
        }

        .flip-shell {
          width: min(860px, 100%);
          max-height: min(92vh, 860px);
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55);
          padding: var(--space-2);

          transform-origin: center;
          transition: transform 320ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease-out;
          will-change: transform, opacity;
        }

        .flip-x {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 70;

          width: 44px;
          height: 44px;
          border-radius: 14px;

          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(255, 255, 255, 0.92);

          font-size: 28px;
          line-height: 1;
          display: grid;
          place-items: center;

          backdrop-filter: blur(8px);
          transition: transform 120ms ease;
        }

        .flip-x:hover {
          transform: scale(1.03);
        }

        @media (max-width: 680px) {
          .toolbar {
            position: fixed;
            right: 14px;
            bottom: calc(14px + env(safe-area-inset-bottom, 0px));
            justify-content: flex-end;
            z-index: 50;
          }

          .toolbar-actions {
            flex-direction: column;
            align-items: flex-end;
          }

          .toolbar-panel {
            top: auto;
            bottom: calc(100% + 10px);
            right: 0;
          }

          .panel-body {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Shell>
  );
}
