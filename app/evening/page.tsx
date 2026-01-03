// /app/evening/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { EveningCardCatalogItem } from "@/src/lib/types";

type IntentKey =
  | "dream_recall"
  | "lucid"
  | "nightmares"
  | "downshift"
  | "deep_sleep"
  | "safety"
  | "emotion"
  | "problem_solving"
  | "creativity"
  | "symbols"
  | "life_direction"
  | "habits"
  | "body_integration"
  | "learning"
  | "spiritual_grounded";

const INTENT_LABEL: Record<IntentKey, string> = {
  dream_recall: "Álomemlékezet",
  lucid: "Lucid",
  nightmares: "Rémálmok",
  downshift: "Lecsengés / Stressz",
  deep_sleep: "Mély alvás",
  safety: "Biztonságérzet",
  emotion: "Érzelmi",
  problem_solving: "Problémamegoldás",
  creativity: "Kreativitás",
  symbols: "Szimbólumok",
  life_direction: "Életirány",
  habits: "Szokás",
  body_integration: "Test–tudat",
  learning: "Tanulás",
  spiritual_grounded: "Spirituális (keretben)",
};

const INTENT_SECTIONS: { key: IntentKey; title: string }[] = [
  { key: "downshift", title: "Lecsengés / Stressz" },
  { key: "safety", title: "Biztonságérzet" },
  { key: "deep_sleep", title: "Mély alvás" },
  { key: "dream_recall", title: "Álomemlékezet" },
  { key: "lucid", title: "Lucid" },
  { key: "nightmares", title: "Rémálmok" },
  { key: "emotion", title: "Érzelmi" },
  { key: "problem_solving", title: "Problémamegoldás" },
  { key: "creativity", title: "Kreativitás" },
  { key: "symbols", title: "Szimbólumok" },
  { key: "life_direction", title: "Életirány" },
  { key: "habits", title: "Szokás" },
  { key: "body_integration", title: "Test–tudat" },
  { key: "learning", title: "Tanulás" },
  { key: "spiritual_grounded", title: "Spirituális (keretben)" },
];

function getIntents(card: EveningCardCatalogItem): IntentKey[] {
  const intents = (card?.content as any)?.intents;
  if (Array.isArray(intents)) return intents as IntentKey[];
  return [];
}

export default function EveningLanding() {
  const { loading } = useRequireAuth();
  const [cards, setCards] = useState<EveningCardCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [selectedIntent, setSelectedIntent] = useState<IntentKey | "all">("all");

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<"overview" | "practice">("overview");
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, is_active, content, sort_order, version")
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

    // focus close button
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

  const allIntentsInData = useMemo(() => {
    const s = new Set<IntentKey>();
    for (const c of cards) for (const i of getIntents(c)) s.add(i);
    const order = Object.keys(INTENT_LABEL) as IntentKey[];
    return order.filter((k) => s.has(k));
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (selectedIntent === "all") return cards;
    return cards.filter((c) => getIntents(c).includes(selectedIntent));
  }, [cards, selectedIntent]);

  const openCard = useMemo(() => {
    return openSlug ? filteredCards.find((c) => c.slug === openSlug) ?? null : null;
  }, [openSlug, filteredCards]);

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
    setPhase("overview");
    setCompleted(false);
    setFinishing(false);
  }

  function closeModal() {
    setOpenSlug(null);
    setPhase("overview");
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

    const effect = m?.effect ?? "";
    const time = m?.time ?? "";
    const notRec = m?.not_recommended ?? "";
    const g = ((c.content as any)?.goal_md ?? "") as string;

    return (
      <Card key={c.slug} className="stack-tight evening-card">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div className="card-title">{c.title}</div>
          {time ? <span className="meta-pill">{time}</span> : null}
        </div>

        {effect ? <div className="effect-line">{effect}</div> : null}
        {g ? <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.35 }}>{g}</div> : null}
        {notRec ? <div className="warn-line">Mikor ne: {notRec}</div> : null}

        <button className="btn btn-primary" onClick={() => openModal(c.slug)} style={{ width: "fit-content" }}>
          Indítás
        </button>
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

  return (
    <Shell title="Esti tér" space="evening">
      {loading ? (
        Spinner
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          <div className="stack-tight">
            <p style={{ color: "var(--text-muted)" }}>
              Válassz egy kártyát az estédhez. Rövid, finom gyakorlatok — a végük “átcsúszik” alvásba.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/new" className="btn btn-secondary">
                Álomtér
              </Link>
            </div>

            {/* intent chips */}
            <div className="intent-row">
              <button
                className={`intent-chip ${selectedIntent === "all" ? "active" : ""}`}
                onClick={() => setSelectedIntent("all")}
              >
                Mind
              </button>
              {allIntentsInData.map((k) => (
                <button
                  key={k}
                  className={`intent-chip ${selectedIntent === k ? "active" : ""}`}
                  onClick={() => setSelectedIntent(k)}
                >
                  {INTENT_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          {/* grouped (all) vs filtered (single intent) */}
          {selectedIntent === "all" ? (
            <div className="stack">
              {INTENT_SECTIONS.map((sec) => {
                const group = cards.filter((c) => getIntents(c).includes(sec.key));
                if (group.length === 0) return null;

                return (
                  <div key={sec.key} className="stack-tight">
                    <div className="section-head">
                      <div className="section-title">{sec.title}</div>
                      <button className="mini-link" onClick={() => setSelectedIntent(sec.key)}>
                        Szűrés erre
                      </button>
                    </div>

                    <div className="evening-grid">{group.map((c) => renderCardTile(c))}</div>
                  </div>
                );
              })}
            </div>
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
                  Esti gyakorlat – fókuszált nézet. ESC: bezárás.
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
                      <Link className="btn btn-secondary" href="/new">
                        Álomtér
                      </Link>
                    </div>
                  </Card>
                ) : phase === "overview" ? (
                  <Card className="stack-tight" style={{ maxWidth: 620, margin: "0 auto" }}>
                    {meta?.time ? <div className="meta-block">{meta.time}</div> : null}
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
                      <button className="btn btn-primary" onClick={() => setPhase("practice")}>
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

                .intent-row {
                  display: flex;
                  gap: 8px;
                  margin-top: 10px;
                  overflow-x: auto;
                  padding-bottom: 6px; /* hogy ne vágja le a scrollbar */
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: thin;
                }

                .intent-row::-webkit-scrollbar {
                  height: 6px;
                }
                .intent-row::-webkit-scrollbar-thumb {
                  background: var(--border);
                  border-radius: 999px;
                }

                .intent-chip {
                  flex: 0 0 auto; /* ne törjön */
                  font-size: 12px;
                  padding: 7px 11px;
                  border: 1px solid var(--border);
                  border-radius: 999px;
                  color: var(--text-muted);
                  background: transparent;
                  cursor: pointer;
                  white-space: nowrap; /* ne csússzon szét */
                }

                .intent-chip.active {
                  color: var(--text);
                  border-color: var(--text-muted);
                }

                .section-head {
                  display: flex;
                  align-items: baseline;
                  justify-content: space-between;
                  gap: 12px;
                }

                .mini-link {
                  background: transparent;
                  border: none;
                  padding: 0;
                  cursor: pointer;
                  color: var(--text-muted);
                  font-size: 12px;
                  text-decoration: underline;
                }
                .mini-link:hover {
                  color: var(--text);
                }

                .meta-pill {
                  font-size: 12px;
                  padding: 4px 8px;
                  border: 1px solid var(--border);
                  border-radius: 999px;
                  color: var(--text-muted);
                  white-space: nowrap;
                }

                .effect-line {
                  font-size: 13px;
                  font-weight: 650;
                }

                .warn-line {
                  font-size: 12px;
                  color: var(--text-muted);
                  opacity: 0.9;
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
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
