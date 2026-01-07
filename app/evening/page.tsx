"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { EveningCardCatalogItem } from "@/src/lib/types";
import { EveningCardTile } from "@/components/EveningCardTile";
import { EveningCardFlip } from "@/components/EveningCardFlip";

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

  // overlay
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // grow-from-tile
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [opening, setOpening] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

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

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
    const hour = new Date().getHours();
    const isNight = hour >= 0 && hour <= 6;

    const rescue = filteredCards.filter((c) => getPhase(c) === "rescue");
    const other = filteredCards.filter((c) => getPhase(c) !== "rescue");

    const otherShuffled = shuffleDeterministic(other, seedRef.current);
    const rescueShuffled = shuffleDeterministic(rescue, seedRef.current ^ 1337);

    return isNight ? [...rescueShuffled, ...otherShuffled] : [...otherShuffled, ...rescueShuffled];
  }, [filteredCards]);

  const openCard = useMemo(() => {
    return openSlug ? cards.find((c) => c.slug === openSlug) ?? null : null;
  }, [openSlug, cards]);

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

  const Spinner = (
    <>
      <div
        aria-label="Betöltés"
        className="spinner"
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          border: "2px solid var(--border)",
          borderTopColor: "var(--text-muted)",
          animation: "spin 0.9s linear infinite",
          marginTop: 8,
        }}
      />
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );

  return (
    <Shell
      title="Álom előkészítő gyakorlatok"
      space="evening"
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
        Spinner
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          <div className="filters">
            <div className="filter">
              <div className="filter-label">Fázis</div>
              <select
                className="select"
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value as PhaseKey | "all")}
              >
                <option value="all">Minden fázis</option>
                {allPhasesInData.map((k) => (
                  <option key={k} value={k}>
                    {PHASE_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter">
              <div className="filter-label">Szándék</div>
              <select
                className="select"
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value as IntentKey | "all")}
              >
                <option value="all">Minden szándék</option>
                {allIntentsInData.map((k) => (
                  <option key={k} value={k}>
                    {INTENT_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter">
              <div className="filter-label">Idő</div>
              <select className="select" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value as TimeFilterKey)}>
                <option value="all">Bármennyi</option>
                {allTimeBucketsInData.map((k) => (
                  <option key={k} value={k}>
                    {TIME_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="evening-grid">{orderedCards.map((c) => renderCardTile(c))}</div>

          {openSlug && (
            <div
              className="flip-overlay"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeOverlay();
              }}
            >
              <div className="flip-shell" style={computeGrowStyle(originRect, opening)}>
                <div className="flip-shell-head">
                  <div style={{ fontWeight: 900 }}>{openCard?.title ?? "Esti kártya"}</div>
                  <button className="btn btn-secondary" onClick={closeOverlay} ref={closeBtnRef}>
                    Bezárás
                  </button>
                </div>

                <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 10 }}>
                  Kattintás: megnyit • Indítás: fordul • ESC: bezárás
                </div>

                {!openCard ? (
                  <div className="stack">{Spinner}</div>
                ) : (
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
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .filters {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 4px;
        }
        @media (min-width: 720px) {
          .filters {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        .filter {
          display: grid;
          gap: 6px;
        }
        .filter-label {
          font-size: 12px;
          color: var(--text-muted);
        }

        .select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 12px;

          background: var(--select-bg);
          color: var(--select-text);
          outline: none;

          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .select:focus {
          border-color: var(--text-muted);
        }

        .select option {
          background: var(--select-option-bg);
          color: var(--select-option-text);
        }


        .evening-grid {
          display: grid;
          gap: 18px;
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
          padding: 16px;
        }

        .flip-shell {
          width: min(860px, 100%);
          max-height: min(86vh, 900px);
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55);
          padding: 14px;

          transform-origin: center;
          transition: transform 320ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease-out;
          will-change: transform, opacity;
        }

        .flip-shell-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 6px 12px 6px;
          position: sticky;
          top: 0;
          background: var(--bg);
          z-index: 2;
          border-bottom: 1px solid var(--border);
        }
      `}</style>
    </Shell>
  );
}
