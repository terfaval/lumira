// /app/session/[id]/direction/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItem } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";

/** A DB-ben lévő magyar group címkéből stabil key */
function groupKeyFromLabel(raw: unknown): GroupKey {
  const label = String(raw ?? "").trim().toLowerCase();

  // a te adataid alapján:
  if (label.includes("álomemlékezet")) return "memory";
  if (label.includes("érzelmi") || label.includes("testi")) return "somatic";
  if (label.includes("mintázat")) return "patterns";
  if (label.includes("jelent")) return "meaning";
  if (label.includes("kreatív")) return "creative";

  return "other";
}

function groupLabel(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s || "Egyéb";
}

/** Pill token mapping (CSS custom properties) */
function groupToken(k: GroupKey) {
  return { text: `--dirgroup-${k}` as const, bg: `--dirgroup-${k}-bg` as const };
}

function Pill({
  label,
  token,
  neutral = false,
}: {
  label: string;
  token?: { text: string; bg: string } | null;
  neutral?: boolean;
}) {
  if (neutral || !token) {
    return (
      <span className="pill pill--neutral" style={{ fontSize: 12 }}>
        {label}
      </span>
    );
  }
  return (
    <span
      className="pill"
      style={{
        color: `var(${token.text})`,
        background: `var(${token.bg})`,
        borderColor: `var(${token.text})`,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
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

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean);
}

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | "all">("all");

  // overlay
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // stable seed
  const seedRef = useRef<number>(0);
  if (!seedRef.current) seedRef.current = Math.floor(Date.now() % 2147483647);

  const load = useCallback(async () => {
    setErr(null);

    const { data: cat, error: catErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, is_active, content")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (catErr) return setErr(catErr.message);
    setCatalog((cat ?? []) as DirectionCatalogItem[]);

    const { data: ch, error: chErr } = await supabase
      .from("morning_direction_choices")
      .select("direction_slug")
      .eq("session_id", sessionId);

    if (chErr) return setErr(chErr.message);
    if (ch) {
      const m: Record<string, boolean> = {};
      ch.forEach((row: { direction_slug: string }) => {
        m[row.direction_slug] = true;
      });
      setSelected(m);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCard = useMemo(() => {
    return openSlug ? catalog.find((c) => c.slug === openSlug) ?? null : null;
  }, [openSlug, catalog]);

  // lock scroll while overlay open
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
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlug]);

  function closeOverlay() {
    setOpenSlug(null);
    setErr(null);
    setBusy(false);
  }

  function openOverlay(slug: string) {
    setErr(null);
    setOpenSlug(slug);
  }

  const groupsInData = useMemo(() => {
    // készítsünk “key -> label” mappingot a dropdownhoz (a leggyakoribb labelt vesszük)
    const counts: Record<GroupKey, Record<string, number>> = {
      memory: {},
      somatic: {},
      patterns: {},
      meaning: {},
      creative: {},
      other: {},
    };

    for (const d of catalog) {
      const raw = (d as any)?.content?.group;
      const k = groupKeyFromLabel(raw);
      const label = groupLabel(raw);
      counts[k][label] = (counts[k][label] ?? 0) + 1;
    }

    const keys = Object.keys(counts) as GroupKey[];
    const out = keys
      .map((k) => {
        const labels = counts[k];
        const bestLabel =
          Object.entries(labels).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          (k === "other" ? "Egyéb" : k);
        return { key: k, label: bestLabel };
      })
      .filter((x) => x.label && (Object.keys(counts[x.key]).length > 0));

    // fix order (szép UX)
    const order: GroupKey[] = ["memory", "somatic", "patterns", "meaning", "creative", "other"];
    return order
      .map((k) => out.find((x) => x.key === k))
      .filter(Boolean) as { key: GroupKey; label: string }[];
  }, [catalog]);

  const filtered = useMemo(() => {
    let out = catalog;
    if (selectedGroup !== "all") {
      out = out.filter((d) => groupKeyFromLabel((d as any)?.content?.group) === selectedGroup);
    }
    return out;
  }, [catalog, selectedGroup]);

  const ordered = useMemo(() => {
    // stabil, de “élő” érzet: determinisztikus shuffle a filterelt listán
    return shuffleDeterministic(filtered, seedRef.current);
  }, [filtered]);

  const handleStart = useCallback(
    async (slug: string) => {
      setBusy(true);
      setErr(null);
      try {
        const result = await startDirection(sessionId, slug);
        if (!result.success) {
          setErr("Hiba történt, próbáld újra.");
          return;
        }
        setSelected((prev) => ({ ...prev, [slug]: true }));
        closeOverlay();
        router.push(`/session/${sessionId}/work?direction=${encodeURIComponent(slug)}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba";
        setErr(message);
      } finally {
        setBusy(false);
      }
    },
    [router, sessionId]
  );

  const Spinner = (
    <>
      <div
        aria-label="Betöltés"
        className="spinner"
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          border: "2px solid var(--line-soft)",
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

  function renderTile(d: DirectionCatalogItem) {
    const rawGroup = (d as any)?.content?.group;
    const gKey = groupKeyFromLabel(rawGroup);
    const gLabel = groupLabel(rawGroup);
    const token = groupToken(gKey);
    const chosen = !!selected[d.slug];

    // tags: max 2 (ha van)
    const tags = safeStringArray((d as any)?.tags).slice(0, 2);

    return (
      <button
        key={d.slug}
        type="button"
        onClick={() => openOverlay(d.slug)}
        className="direction-tile"
        style={{ textAlign: "left" }}
      >
        <div className="direction-tile-top">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Pill label={gLabel} token={token} />
            {chosen && <Pill label="Korábban kiválasztva" neutral />}
            {tags.map((t) => (
              <Pill key={t} label={t} neutral />
            ))}
          </div>

          <div className="direction-title">{d.title}</div>

          <div className="direction-desc">
            {(d as any)?.content?.micro_description ?? d.description ?? ""}
          </div>
        </div>

        <div className="direction-tile-bottom">
          <span className="direction-hint">Megnyitás</span>
          <span aria-hidden="true" className="direction-arrow">
            →
          </span>
        </div>
      </button>
    );
  }

  // overlay content extraction
  const overlayData = useMemo(() => {
    if (!openCard) return null;

    const c = (openCard as any)?.content ?? {};
    const method = c?.method_spec ?? {};
    const safety = c?.safety ?? {};
    const stop = c?.stop_criteria ?? {};
    const contract = c?.ai_contract ?? {};

    const doList = safeStringArray(method?.do);
    const dontList = safeStringArray(method?.dont);

    return {
      groupLabel: groupLabel(c?.group),
      groupKey: groupKeyFromLabel(c?.group),

      micro: typeof c?.micro_description === "string" ? c.micro_description : null,
      goal: typeof c?.goal_md === "string" ? c.goal_md : null,

      maxCards: typeof stop?.max_cards === "number" ? stop.max_cards : null,
      stopRule: typeof method?.stop_rule === "string" ? method.stop_rule : null,

      role: typeof contract?.role === "string" ? contract.role : null,
      toneTags: safeStringArray(contract?.tone_tags),

      doList,
      dontList,

      boundaries: typeof safety?.boundaries_md === "string" ? safety.boundaries_md : null,
      flags: safeStringArray(safety?.flags),
    };
  }, [openCard]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="direction-overlay"
      onMouseDown={(e) => {
        // háttérre kattintásra zárás + vissza a mögöttes oldalra
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div className="direction-sheet" role="document">
        <div className="direction-head">
          <div className="direction-head-left">
            <div className="split-panel-title">Irányválasztás</div>
            <div className="direction-subtitle">
              Válassz egy irányt – nyisd meg, nézd meg a keretet, és csak akkor indítsd, ha ma belefér.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => router.back()} aria-label="Bezárás">
            Bezárás
          </button>
        </div>

        {loading ? (
          <div style={{ paddingTop: 8 }}>{Spinner}</div>
        ) : (
          <div className="stack">
            {err && <p style={{ color: "crimson" }}>{err}</p>}

            <div className="filters">
              <div className="filter">
                <div className="filter-label">Csoport</div>
                <select
                  className="select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value as GroupKey | "all")}
                >
                  <option value="all">Minden csoport</option>
                  {groupsInData.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-note">
                Tipp: ha az álom felkavaró, válassz testi/grounding fókuszt, és tarts rövid lépéseket.
              </div>
            </div>

            <div className="direction-grid">{ordered.map((d) => renderTile(d))}</div>

            {openSlug && (
              <div
                className="flip-overlay"
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeOverlay();
                }}
              >
                <div className="flip-shell">
                  <div className="flip-shell-head">
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {overlayData ? (
                          <Pill label={overlayData.groupLabel} token={groupToken(overlayData.groupKey)} />
                        ) : null}
                        {openCard && selected[openCard.slug] ? <Pill label="Korábban kiválasztva" neutral /> : null}
                        {overlayData?.flags?.length ? (
                          <Pill label={`Safety: ${overlayData.flags.join(", ")}`} neutral />
                        ) : null}
                      </div>

                      <div style={{ fontWeight: 900, fontSize: 18 }}>{openCard?.title ?? "Irány"}</div>
                    </div>

                    <button className="btn btn-secondary" onClick={closeOverlay} ref={closeBtnRef}>
                      Bezárás
                    </button>
                  </div>

                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 10 }}>
                    Megnyitás: részletek • Indítás: Work • ESC: bezárás
                  </div>

                  {!openCard ? (
                    <div className="stack">{Spinner}</div>
                  ) : (
                    <div className="stack">
                      {overlayData?.micro ? (
                        <div className="card-muted" style={{ padding: "var(--space-3)" }}>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>Röviden</div>
                          <div style={{ color: "var(--text-muted)" }}>{overlayData.micro}</div>
                        </div>
                      ) : null}

                      {overlayData?.goal ? (
                        <div className="card-muted" style={{ padding: "var(--space-3)" }}>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>Cél</div>
                          <div style={{ color: "var(--text-muted)" }}>{overlayData.goal}</div>
                        </div>
                      ) : null}

                      <div className="two-col">
                        <div className="card-muted" style={{ padding: "var(--space-3)" }}>
                          <div style={{ fontWeight: 800, marginBottom: 10 }}>Mit csinálunk</div>
                          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
                            {(overlayData?.doList ?? []).map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                            {!overlayData?.doList?.length ? <li>Nincs megadva.</li> : null}
                          </ul>
                        </div>

                        <div className="card-muted" style={{ padding: "var(--space-3)" }}>
                          <div style={{ fontWeight: 800, marginBottom: 10 }}>Mit kerüljünk</div>
                          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
                            {(overlayData?.dontList ?? []).map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                            {!overlayData?.dontList?.length ? <li>Nincs megadva.</li> : null}
                          </ul>
                        </div>
                      </div>

                      <div className="card-muted" style={{ padding: "var(--space-3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ fontWeight: 800 }}>Leállás / keret</div>
                            <div style={{ color: "var(--text-muted)" }}>
                              {overlayData?.maxCards ? `Max. lépések: ${overlayData.maxCards}` : "Max. lépések: –"}
                              {overlayData?.role ? ` • Szerep: ${overlayData.role}` : ""}
                              {overlayData?.toneTags?.length ? ` • Tone: ${overlayData.toneTags.join(", ")}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <button className="btn btn-secondary" onClick={closeOverlay} disabled={busy}>
                              Mégsem
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleStart(openCard.slug)}
                              disabled={busy}
                            >
                              {busy ? "Indítás..." : "Indítás"}
                            </button>
                          </div>
                        </div>

                        {overlayData?.boundaries ? (
                          <div style={{ marginTop: 12, color: "var(--text-muted)" }}>{overlayData.boundaries}</div>
                        ) : null}
                      </div>

                      {err && <p style={{ color: "crimson" }}>{err}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .direction-overlay {
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

        .direction-sheet {
          width: min(1040px, 100%);
          max-height: min(86vh, 900px);
          overflow: auto;
          border: 1px solid var(--line-soft);
          border-radius: 18px;
          background: var(--bg-layer);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55);
          padding: var(--space-3);
          display: grid;
          gap: var(--space-3);
        }

        .direction-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-3);
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--line-soft);
          position: sticky;
          top: 0;
          background: var(--bg-layer);
          z-index: 2;
        }

        .direction-head-left {
          display: grid;
          gap: 6px;
        }

        .direction-subtitle {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-2);
        }
        @media (min-width: 820px) {
          .filters {
            grid-template-columns: 320px 1fr;
            align-items: end;
          }
        }

        .filter {
          display: grid;
          gap: var(--space-1);
        }
        .filter-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .filter-note {
          color: var(--text-muted);
          font-size: 12px;
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--line-soft);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
        }

        .direction-grid {
          display: grid;
          gap: var(--space-4);
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 860px) {
          .direction-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .direction-tile {
          border: 1px solid var(--line-soft);
          border-radius: 18px;
          background: linear-gradient(
            135deg,
            var(--evening-card-paper-strong) 0%,
            var(--evening-card-paper) 44%,
            var(--accent) 112%
          );
          box-shadow: var(--shadow-soft);
          padding: var(--space-3);
          display: grid;
          gap: var(--space-3);
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 200ms ease;
          color: inherit;
        }

        .direction-tile:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
        }

        .direction-tile-top {
          display: grid;
          gap: 10px;
        }

        .direction-title {
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.01em;
        }

        .direction-desc {
          color: rgba(255, 255, 255, 0.82);
          font-size: 13px;
          line-height: 1.6;
        }

        .direction-tile-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
        }

        .flip-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-3);
        }

        .flip-shell {
          width: min(860px, 100%);
          max-height: min(86vh, 900px);
          overflow: auto;
          border: 1px solid var(--line-soft);
          border-radius: 18px;
          background: var(--bg-layer);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55);
          padding: var(--space-3);
        }

        .flip-shell-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-3);
          padding: var(--space-1) var(--space-1) var(--space-3);
          position: sticky;
          top: 0;
          background: var(--bg-layer);
          z-index: 2;
          border-bottom: 1px solid var(--line-soft);
        }

        .two-col {
          display: grid;
          gap: var(--space-3);
          grid-template-columns: 1fr;
        }
        @media (min-width: 860px) {
          .two-col {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 679px) {
          .direction-sheet {
            width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }
          .flip-shell {
            width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
