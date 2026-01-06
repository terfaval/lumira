"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { EveningCardCatalogItem } from "@/src/lib/types";

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

/**
 * Determinisztikus shuffle (hogy ne ugráljon minden renderre).
 * Mulberry32: gyors, elég jó UI-hoz.
 */
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

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function intentColor(intent: IntentKey | null): { text: string; bg: string } {
  const map: Record<IntentKey, string> = {
    biztonsag: "--intent-biztonsag",
    lecsendesites: "--intent-lecsendesites",
    emlekezet: "--intent-emlekezet",
    tudatossag: "--intent-tudatossag",
    kreativ_inkubacio: "--intent-kreativ_inkubacio",
    irany_es_jelentes: "--intent-irany_es_jelentes",
    test_es_jelenlet: "--intent-test_es_jelenlet",
  };

  if (!intent) {
    return { text: "rgba(200,200,200,0.95)", bg: "rgba(200,200,200,0.20)" };
  }

  const token = map[intent];
  const text = cssVar(token, "rgba(200,200,200,0.95)");
  const alpha = cssVar("--intent-glow-alpha", "0.32");

  // bg = ugyanaz a szín, csak kisebb alpha-val (rgba(...) már alpha-s, de oké:
  // itt egyszerűen visszaadjuk a text színt, és a gradientben “paper” viszi a lágyságot)
  // Ha később akarod: átírhatjuk okosabb rgba parse-ra.
  const bg = text.replace(/rgba\(([^)]+)\)/, (m) => {
    // ha már rgba, hagyjuk: a paper úgyis puhít
    return m;
  });

  // ha a token rgb lenne, akkor itt alpha-val egészítenénk ki.
  // most rgba-kat adunk meg a tokenekben, így elég.
  return { text, bg: bg.replace(/,\s*0\.\d+\)/, `, ${alpha})`) };
}


function phaseColor(phase: PhaseKey | null): string {
  const map: Record<PhaseKey, string> = {
    prep: "--phase-prep",
    in_bed: "--phase-in_bed",
    rescue: "--phase-rescue",
  };
  if (!phase) return "rgba(200,200,200,0.95)";
  return cssVar(map[phase], "rgba(200,200,200,0.95)");
}


// Egyszerű magyarítás a “technical tag” stringekre.
// Ha valami nincs benne, fallback az eredetire.
const TAG_HU: Record<string, string> = {
  "sleep-prep": "Alvás előkészítés",
  sleep: "Alvás",
  rescue: "Éjjeli mentés",
  breath: "Légzés",
  grounding: "Földelés",
  safety: "Biztonság",
  "mental-offload": "Mentális teherlerakás",
  incubation: "Inkubáció",
  learning: "Tanulás",
  memory: "Emlékezet",
  "dream-recall": "Álomemlékezet",
  lucid: "Lucid",
  "dreamwork": "Álommunka",
  emotion: "Érzelem",
  "nervous-system": "Idegrendszer",
  "downshift": "Lecsengés",
  "body-awareness": "Testtudat",
  body: "Test",
  meaning: "Jelentés",
  values: "Értékek",
  gentle: "Szelíd",
  "imagery-rehearsal": "Kép-átírás",
  nightmares: "Rémálmok",
};

function huTag(t: string): string {
  return TAG_HU[t] ?? t;
}

export default function EveningLanding() {
  const { loading } = useRequireAuth();
  const [cards, setCards] = useState<EveningCardCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [selectedPhase, setSelectedPhase] = useState<PhaseKey | "all">("all");
  const [selectedIntent, setSelectedIntent] = useState<IntentKey | "all">("all");

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [viewPhase, setViewPhase] = useState<"overview" | "practice">("overview");
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // stabil seed a random sorrendhez
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

  // lock scroll when modal open
  useEffect(() => {
    if (!openSlug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openSlug]);

  // ESC close + basic focus trap
  useEffect(() => {
    if (!openSlug) return;

    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key !== "Tab") return;

      const root = modalRef.current;
      if (!root) return;

      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
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

  const filteredCards = useMemo(() => {
    let out = cards;

    if (selectedPhase !== "all") {
      out = out.filter((c) => getPhase(c) === selectedPhase);
    }
    if (selectedIntent !== "all") {
      out = out.filter((c) => getIntents(c).includes(selectedIntent));
    }

    return out;
  }, [cards, selectedPhase, selectedIntent]);

  // Alapsorrend: éjjel rescue elöl, különben prep+in_bed random, rescue a végén.
  const orderedCards = useMemo(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 0 && hour <= 6;

    const rescue = filteredCards.filter((c) => getPhase(c) === "rescue");
    const other = filteredCards.filter((c) => getPhase(c) !== "rescue");

    const otherShuffled = shuffleDeterministic(other, seedRef.current);
    const rescueShuffled = shuffleDeterministic(rescue, seedRef.current ^ 1337);

    if (isNight) return [...rescueShuffled, ...otherShuffled];

    // nappal/este: “random legyenek in-bed és prep”, rescue menjen hátra
    return [...otherShuffled, ...rescueShuffled];
  }, [filteredCards]);

  const openCard = useMemo(() => {
    return openSlug ? cards.find((c) => c.slug === openSlug) ?? null : null;
  }, [openSlug, cards]);

  const meta = (openCard?.content as any)?.meta as
    | { time?: string; effect?: string; not_recommended?: string }
    | undefined;

  const tips = ((openCard?.content as any)?.tips ?? []) as string[];
  const steps = (((openCard?.content as any)?.steps ?? []) as { question?: string }[]).filter(
    (s) => (s?.question ?? "").trim().length > 0
  );
  const goal = ((openCard?.content as any)?.goal_md ?? "") as string;

  function openModal(slug: string) {
    setOpenSlug(slug);
    setViewPhase("overview");
    setCompleted(false);
    setFinishing(false);
  }

  function closeModal() {
    setOpenSlug(null);
    setViewPhase("overview");
    setCompleted(false);
    setFinishing(false);
  }

  async function finishRun() {
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
      setCompleted(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Nem sikerült menteni a befejezést.";
      setErr(message);
    } finally {
      setFinishing(false);
    }
  }

  function renderCardTile(c: EveningCardCatalogItem) {
    const m = (c.content as any)?.meta as
      | { time?: string; effect?: string; not_recommended?: string }
      | undefined;

    const time = m?.time ?? "";
    const g = ((c.content as any)?.goal_md ?? "") as string;

    const p = getPhase(c);
    const intentKeys = getIntents(c);
    const primaryIntent = intentKeys[0] ?? null;

    const pc = phaseColor(p);
    const ic = intentColor(primaryIntent);

    const tags = (((c as any)?.tags ?? []) as string[]).slice(0, 3);

    return (
      <Card
        key={c.slug}
        className="evening-card"
        onClick={() => openModal(c.slug)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openModal(c.slug);
        }}
        style={{
          background: `linear-gradient(135deg,
            var(--evening-card-paper-strong) 0%,
            var(--evening-card-paper) 30%,
            ${ic.bg} 110%)`,
        }}
      >
        {/* top row: phase + intent + time (egy vonalban) */}
        <div className="card-top">
          <div className="pill-row">
            {primaryIntent ? (
              <span className="pill pill--intent" style={{ color: ic.text, borderColor: ic.text }}>
                {INTENT_LABEL[primaryIntent]}
              </span>
            ) : null}

            {p ? (
              <span className="pill pill--phase" style={{ color: pc, borderColor: pc }}>
                {PHASE_LABEL[p]}
              </span>
            ) : null}
          </div>

          {time ? <div className="card-time">{time}</div> : null}
        </div>

        <div className="card-title">{c.title}</div>

        {g ? <div className="card-body">{g}</div> : null}

        {tags.length ? (
          <div className="tag-row">
            {tags.map((t: string) => (
              <span key={t} className="pill pill--neutral">
                {huTag(t)}
              </span>
            ))}
          </div>
        ) : null}
      </Card>
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

  const openCardPhase = openCard ? getPhase(openCard) : null;

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
          Ezek rövid, kíméletes gyakorlatok az elalvás előtti átmenethez, valamint azokra 
          az éjszakai pillanatokra, amikor túl éberen ébredsz és nehezedre esik visszaaludni.
        </p>

        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <li>Az egyes fázisok és szándékok segítségével könnyebben tudsz választani, </li>
          <li>hogy megtaláld az alkalomhoz és a céljaidhoz leginkább megfelelő gyakorlatot</li>
          <li>Nyisd meg a kártyát, és csak annyit csinálj, amennyi ma belefér.</li>
          <li>
            Ha bármelyik gyakorlat élénkít vagy feszít, válts egyszerűbb, test- vagy légzésfókuszú kártyára.
          </li>
        </ul>
      </div>
    }
  >

      {loading ? (
        Spinner
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          {/* Filters (két dropdown egymás mellett) */}
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
          </div>

          <div className="evening-grid">{orderedCards.map((c) => renderCardTile(c))}</div>

          {/* modal */}
          {openSlug && (
            <div
              className="evening-overlay"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeModal();
              }}
            >
              <div
                className="evening-modal"
                ref={modalRef}
                aria-labelledby="evening-modal-title"
                aria-describedby="evening-modal-desc"
              >
                <div className="evening-modal-head">
                  <div id="evening-modal-title" style={{ fontWeight: 800 }}>
                    {openCard?.title ?? "Esti kártya"}
                  </div>
                  <button className="btn btn-secondary" onClick={closeModal} ref={closeBtnRef}>
                    Bezárás
                  </button>
                </div>

                <div id="evening-modal-desc" style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>
                  Esti kártya – fókuszált nézet{openCardPhase ? ` • ${PHASE_LABEL[openCardPhase]}` : ""}. ESC: bezárás.
                </div>

                {!openCard ? (
                  <div className="stack">{Spinner}</div>
                ) : completed ? (
                  <Card className="stack-tight" style={{ maxWidth: 620, margin: "0 auto" }}>
                    <div style={{ fontWeight: 800 }}>Jó pihenést és szép álmokat.</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={closeModal}>
                        Kész
                      </button>
                    </div>
                  </Card>
                ) : viewPhase === "overview" ? (
                  <Card className="stack-tight" style={{ maxWidth: 620, margin: "0 auto" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {openCardPhase ? <div className="meta-block">{PHASE_LABEL[openCardPhase]}</div> : null}
                      {meta?.time ? <div className="meta-block">{meta.time}</div> : null}
                    </div>

                    {meta?.effect ? <div style={{ fontWeight: 700 }}>{meta.effect}</div> : null}
                    {goal ? <div style={{ color: "var(--text-muted)" }}>{goal}</div> : null}

                    <div style={{ marginTop: 10 }}>
                      {meta?.not_recommended ? (
                        <div className="disclaimer">
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Mikor ne</div>
                          <div style={{ color: "var(--text-muted)" }}>{meta.not_recommended}</div>
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={() => setViewPhase("practice")}>
                        Indítás
                      </button>
                    </div>
                  </Card>
                ) : (
                  <Card className="stack-tight" style={{ maxWidth: 620, margin: "0 auto" }}>
                    {tips?.length ? (
                      <div className="stack-tight">
                        <div className="section-title">Tippek</div>
                        <ul style={{ paddingLeft: 18, display: "grid", gap: 6, margin: 0 }}>
                          {tips.map((t, i) => (
                            <li key={i} style={{ color: "var(--text-muted)" }}>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="stack-tight" style={{ marginTop: 10 }}>
                      <div className="section-title">Lépések</div>

                      <div className="steps">
                        {steps.map((s, idx) => (
                          <div key={idx} className="step-row">
                            <div className="step-num">{idx + 1}</div>
                            <div className="step-text">{s.question}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button className="btn btn-primary" onClick={finishRun} disabled={finishing}>
                        {finishing ? "Mentés…" : "Befejezés"}
                      </button>
                    </div>
                  </Card>
                )}

                {err ? <div style={{ color: "crimson", marginTop: 10 }}>{err}</div> : null}
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
            grid-template-columns: 1fr 1fr;
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
          background: transparent;
          color: var(--text);
          outline: none;
        }
        .select:focus {
          border-color: var(--text-muted);
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

        /* CARD */
        .evening-card {
          cursor: pointer;
          border-radius: 18px;
          transition: transform 160ms ease, box-shadow 160ms ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
        }

        .evening-card:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .pill-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          flex: 1;
          justify-content: flex-start;
        }

        /* “nem kattintható lekerekített gomb” */
        .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          
          min-height: 30px;
          padding: 7px 12px;
          
          border-radius: 999px;
          border: 2.25px solid currentColor;
          background: var(--evening-pill-bg);

          font-size: 11pt;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }

        .pill--neutral {
          color: var(--text-muted);
          border-color: var(--line-soft);     /* vagy var(--border) */
          background: rgba(255, 255, 255, 0.06);
          box-shadow: none;
        }

        .card-time {
          margin-left: auto;
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
          font-weight: 700;
        }

        /* Title nagyobb + vastagabb */
        .card-title {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }

        .card-body {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.35;
        }

        .tag-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .tag {
          font-size: 10px;
          padding: 6px 10px;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.06);
          white-space: nowrap;
        }

        .meta-block {
          font-size: 11px;
          padding: 6px 10px;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: var(--text-muted);
          width: fit-content;
        }

        .disclaimer {
          border-top: 1px solid var(--border);
          padding-top: 10px;
        }

        .steps {
          display: grid;
          gap: 10px;
        }

        .step-row {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: start;
        }

        .step-num {
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
          opacity: 0.75;
        }

        .step-text {
          font-size: 15px;
          font-weight: 650;
          line-height: 1.35;
        }

        .evening-overlay {
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

        .evening-modal {
          width: min(760px, 100%);
          max-height: min(85vh, 820px);
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
          padding: 14px;
        }

        .evening-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 6px 12px 6px;
          position: sticky;
          top: 0;
          background: var(--bg);
          z-index: 1;
          border-bottom: 1px solid var(--border);
        }
      `}</style>
    </Shell>
  );
}
