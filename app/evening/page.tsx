// /app/evening/page.tsx
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

const PHASE_SECTIONS: { key: PhaseKey; title: string; subtitle?: string }[] = [
  { key: "prep", title: "Előkészítés", subtitle: "Rövid lerakások / inkubáció még lefekvés előtt." },
  { key: "in_bed", title: "Elalvás előtt", subtitle: "Finom, alvásba csúszó gyakorlatok." },
  { key: "rescue", title: "Éjjeli mentés", subtitle: "Ha felébredsz / felriadsz: gyors, stabilizáló visszatérés." },
];

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

// explicit order (dropdown-hoz)
const INTENT_SECTIONS: { key: IntentKey; title: string }[] = [
  { key: "lecsendesites", title: "Lecsengés" },
  { key: "biztonsag", title: "Biztonság" },
  { key: "emlekezet", title: "Emlékezet" },
  { key: "tudatossag", title: "Tudatosság" },
  { key: "kreativ_inkubacio", title: "Kreatív inkubáció" },
  { key: "irany_es_jelentes", title: "Irány / Jelentés" },
  { key: "test_es_jelenlet", title: "Test / Jelenlét" },
];

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

function intentColor(intent: IntentKey): { rgb: string; rgbaSoft: string } {
  // visszafogott, “pasztell” végekhez (a gradienthez)
  // rgb: a chip színéhez; rgbaSoft: a gradienthez (alfa)
  switch (intent) {
    case "lecsendesites":
      return { rgb: "99 102 241", rgbaSoft: "rgba(99,102,241,0.16)" }; // indigo
    case "biztonsag":
      return { rgb: "16 185 129", rgbaSoft: "rgba(16,185,129,0.16)" }; // emerald
    case "emlekezet":
      return { rgb: "59 130 246", rgbaSoft: "rgba(59,130,246,0.16)" }; // blue
    case "tudatossag":
      return { rgb: "168 85 247", rgbaSoft: "rgba(168,85,247,0.16)" }; // purple
    case "kreativ_inkubacio":
      return { rgb: "245 158 11", rgbaSoft: "rgba(245,158,11,0.16)" }; // amber
    case "irany_es_jelentes":
      return { rgb: "234 88 12", rgbaSoft: "rgba(234,88,12,0.16)" }; // orange
    case "test_es_jelenlet":
      return { rgb: "20 184 166", rgbaSoft: "rgba(20,184,166,0.16)" }; // teal
    default:
      return { rgb: "107 114 128", rgbaSoft: "rgba(107,114,128,0.12)" }; // gray
  }
}

function phaseColor(phase: PhaseKey): { rgb: string } {
  switch (phase) {
    case "prep":
      return { rgb: "245 158 11" }; // amber
    case "in_bed":
      return { rgb: "99 102 241" }; // indigo
    case "rescue":
      return { rgb: "239 68 68" }; // red
    default:
      return { rgb: "107 114 128" };
  }
}

function pickPrimaryIntent(intents: IntentKey[]): IntentKey | null {
  // ha több van, legyen “domináns”: biztonság/lecsendesítés előrébb,
  // de ha csak simán sorrendben jön, az is oké.
  const priority: IntentKey[] = [
    "biztonsag",
    "lecsendesites",
    "test_es_jelenlet",
    "emlekezet",
    "tudatossag",
    "irany_es_jelentes",
    "kreativ_inkubacio",
  ];
  for (const p of priority) if (intents.includes(p)) return p;
  return intents[0] ?? null;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleStable<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

  // stabil “random seed” egy oldalletöltésen belül
  const randomSeedRef = useRef<number | null>(null);
  if (randomSeedRef.current === null) {
    // elég stabil, de ne legyen mindig ugyanaz: idő + kis jitter
    randomSeedRef.current = Math.floor(Date.now() % 1000000000);
  }

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, is_active, content, tags, sort_order, version")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

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
    const order = PHASE_SECTIONS.map((x) => x.key);
    return order.filter((k) => s.has(k));
  }, [cards]);

  const allIntentsInData = useMemo(() => {
    const s = new Set<IntentKey>();
    for (const c of cards) for (const i of getIntents(c)) s.add(i);

    const order = INTENT_SECTIONS.map((x) => x.key);
    return order.filter((k) => s.has(k));
  }, [cards]);

  // “napszak szerinti” alap-rendezés az ALL/ALL nézethez
  const cardsDefaultOrdered = useMemo(() => {
    if (cards.length === 0) return cards;

    const hour = new Date().getHours();
    const isNight = hour >= 0 && hour < 6;

    const rescue = cards.filter((c) => getPhase(c) === "rescue");
    const prep = cards.filter((c) => getPhase(c) === "prep");
    const inBed = cards.filter((c) => getPhase(c) === "in_bed");
    const other = cards.filter((c) => getPhase(c) === null);

    if (isNight) {
      // éjszaka: rescue elöl, a többi maradhat a sort_order szerinti sorrendben (ahogy a DB adja)
      return [...rescue, ...inBed, ...prep, ...other];
    }

    // nappal/este: prep + in_bed random keverve elöl, rescue a végén
    const mixed = shuffleStable([...prep, ...inBed], randomSeedRef.current ?? 12345);
    return [...mixed, ...rescue, ...other];
  }, [cards]);

  const filteredCards = useMemo(() => {
    let out = cardsDefaultOrdered;

    if (selectedPhase !== "all") {
      out = out.filter((c) => getPhase(c) === selectedPhase);
    }
    if (selectedIntent !== "all") {
      out = out.filter((c) => getIntents(c).includes(selectedIntent));
    }

    return out;
  }, [cardsDefaultOrdered, selectedPhase, selectedIntent]);

  // openCard a teljes cards-ból jöjjön
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
    const primaryIntent = pickPrimaryIntent(intentKeys);

    const bg = primaryIntent ? intentColor(primaryIntent).rgbaSoft : "rgba(107,114,128,0.10)";

    return (
      <div key={c.slug} className="evening-tile-wrap" onClick={() => openModal(c.slug)} role="button" tabIndex={0}>
        <Card
          className="stack-tight evening-card"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.92) 0%, ${bg} 100%)`,
          }}
        >
          {/* top row */}
          <div className="card-top">
            <div className="pill-row">
              {p ? (
                <span
                  className="pill pill-phase"
                  style={{
                    borderColor: `rgb(${phaseColor(p).rgb})`,
                    color: `rgb(${phaseColor(p).rgb})`,
                  }}
                >
                  {PHASE_LABEL[p]}
                </span>
              ) : null}

              {primaryIntent ? (
                <span
                  className="pill pill-intent"
                  style={{
                    borderColor: `rgb(${intentColor(primaryIntent).rgb})`,
                    color: `rgb(${intentColor(primaryIntent).rgb})`,
                  }}
                >
                  {INTENT_LABEL[primaryIntent]}
                </span>
              ) : null}
            </div>

            {time ? <div className="time-pill">{time}</div> : null}
          </div>

          {/* title */}
          <div className="card-title-strong">{c.title}</div>

          {/* goal_md */}
          {g ? <div className="card-goal">{g}</div> : null}

          {/* tags */}
          {(c.tags?.length ?? 0) > 0 ? (
            <div className="tag-row">
              {(c.tags ?? []).slice(0, 3).map((t) => (
                <span key={t} className="tag-pill">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
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
    <Shell title="Álom előkészítő gyakorlatok" space="evening">
      {loading ? (
        Spinner
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          {/* PAGE HEADER */}
          <div className="page-head">
            <div className="page-title">Álom előkészítő gyakorlatok</div>

            <button
              type="button"
              className="info-btn"
              aria-expanded={infoOpen}
              aria-controls="evening-info"
              onClick={() => setInfoOpen((v) => !v)}
              title="Információ"
            >
              i
            </button>
          </div>

          {infoOpen ? (
            <Card id="evening-info" className="stack-tight">
              <div style={{ fontWeight: 800 }}>Hogyan használd ezt az oldalt?</div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: 14 }}>
                Itt rövid, finom gyakorlatokat találsz az esti átmenethez — úgy, hogy a fókusz ne felpörgessen, hanem
                segítsen <b>kíméletesen</b> áthangolni a figyelmet alvás felé.
                <br />
                <br />
                <b>Válassz állapot szerint:</b>
                <ul style={{ marginTop: 8, paddingLeft: 18, display: "grid", gap: 6 }}>
                  <li>
                    <b>Előkészítés</b>: még lefekvés előtt — mentális lerakás, inkubáció, finom “lezárás”.
                  </li>
                  <li>
                    <b>Elalvás előtt</b>: már ágyban — olyan gyakorlatok, amik természetesen “átcsúsznak” alvásba.
                  </li>
                  <li>
                    <b>Éjjeli mentés</b>: ha felébredsz / felriadsz — gyors visszarendező, stabilizáló lépések.
                  </li>
                </ul>
                <br />
                <b>Szűrés:</b> a két legfontosabb tengely mentén szűrhetsz: fázis és szándék (intent). Ha nem akarsz
                gondolkodni, hagyd “mind”-en, és csak válassz egy szimpatikus kártyát.
                <br />
                <br />
                <b>Tipp:</b> ha valami túl sok, inkább válts <b>Biztonság</b> vagy <b>Lecsengés</b> intentre — ezek a
                legkíméletesebb “vissza a testbe” útvonalak.
              </div>
            </Card>
          ) : null}

          {/* FILTERS (two dropdowns side-by-side) */}
          <div className="filters">
            <div className="filter">
              <div className="filter-label">Fázis</div>
              <select
                className="select"
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value as PhaseKey | "all")}
              >
                <option value="all">Mind</option>
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
                <option value="all">Mind</option>
                {allIntentsInData.map((k) => (
                  <option key={k} value={k}>
                    {INTENT_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GRID / GROUPING */}
          {selectedPhase === "all" && selectedIntent === "all" ? (
            allPhasesInData.length === 0 ? (
              <div className="evening-grid">{cardsDefaultOrdered.map((c) => renderCardTile(c))}</div>
            ) : (
              <div className="stack">
                {PHASE_SECTIONS.map((sec) => {
                  const group = cardsDefaultOrdered.filter((c) => getPhase(c) === sec.key);
                  if (group.length === 0) return null;

                  return (
                    <div key={sec.key} className="stack-tight">
                      <div className="phase-head">
                        <div className="phase-title">{sec.title}</div>
                        {sec.subtitle ? <div className="phase-sub">{sec.subtitle}</div> : null}
                      </div>

                      <div className="evening-grid">{group.map((c) => renderCardTile(c))}</div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="evening-grid">{filteredCards.map((c) => renderCardTile(c))}</div>
          )}

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
        .evening-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 860px) {
          .evening-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .page-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .page-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .info-btn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 900;
          display: grid;
          place-items: center;
          line-height: 1;
        }
        .info-btn:hover {
          color: var(--text);
          border-color: var(--text-muted);
        }

        .filters {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .filter {
          display: grid;
          gap: 6px;
          min-width: 220px;
        }
        .filter-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: transparent;
          color: var(--text);
          padding: 10px 10px;
          outline: none;
        }
        .select:focus {
          border-color: var(--text-muted);
        }

        .phase-head {
          margin-top: 6px;
        }
        .phase-title {
          font-weight: 900;
          letter-spacing: -0.01em;
        }
        .phase-sub {
          color: var(--text-muted);
          font-size: 13px;
          margin-top: 2px;
        }

        .evening-tile-wrap {
          cursor: pointer;
          transform: translateZ(0);
        }

        :global(.evening-card) {
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
          border: 1px solid var(--border);
        }

        .evening-tile-wrap:hover :global(.evening-card) {
          transform: scale(1.02);
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.16);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pill-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .pill {
          font-size: 12px;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.06);
          white-space: nowrap;
          font-weight: 700;
        }

        .time-pill {
          font-size: 12px;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.06);
          white-space: nowrap;
        }

        .card-title-strong {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.01em;
          margin-top: 2px;
        }

        .card-goal {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.4;
        }

        .tag-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .tag-pill {
          font-size: 11px;
          padding: 4px 8px;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: var(--text-muted);
          white-space: nowrap;
          background: rgba(255, 255, 255, 0.04);
        }

        .meta-block {
          font-size: 12px;
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
