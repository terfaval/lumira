"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/Card";
import { Shell } from "@/components/Shell";
import { Pill } from "@/components/Pill";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import {
  fetchArchiveSessions,
  type ArchiveSessionSummary,
  type Feldolgozottsag,
  type RangeOption,
  type SortOption,
} from "@/src/lib/archive";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { requireUserId } from "@/src/lib/db";
import ArchiveControls from "./ArchiveControls";

type ArchiveStatusFilter = Feldolgozottsag | "lezart";

const rangeOptions: RangeOption[] = ["all", "7", "30", "90", "365"];
const sortOptions: SortOption[] = ["date_desc", "date_asc", "score_desc", "score_asc"];

function parseStatus(value: string | undefined): ArchiveStatusFilter | undefined {
  if (value === "vazlat" || value === "erintett" || value === "feldolgozott" || value === "lezart") return value;
  return undefined;
}
function parseRange(value: string | undefined): RangeOption {
  return rangeOptions.find((opt) => opt === value) ?? "all";
}
function parseSort(value: string | undefined): SortOption {
  return sortOptions.find((opt) => opt === value) ?? "date_desc";
}

function applyFilters(sessions: ArchiveSessionSummary[], filters: { status?: ArchiveStatusFilter; directions: string[] }) {
  return sessions.filter((session) => {
    if (filters.status) {
      const computed = getComputedStatus(session);
      if (computed !== filters.status) return false;
    }

    if (filters.directions.length > 0 && !session.touched_groups.some((g) => filters.directions.includes(g))) {
      return false;
    }

    return true;
  });
}

function applySort(sessions: ArchiveSessionSummary[], sort: SortOption): ArchiveSessionSummary[] {
  const sorted = [...sessions];
  sorted.sort((a, b) => {
    if (sort === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === "score_desc") {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sort === "score_asc") {
      if (a.score !== b.score) return a.score - b.score;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return 0;
  });
  return sorted;
}

function formatStatusLabel(status: string) {
  if (status === "vazlat") return "Vázlat";
  if (status === "erintett") return "Érintett";
  if (status === "feldolgozott") return "Feldolgozott";
  if (status === "lezart") return "Lezárt";
  return status;
}

function getComputedStatus(session: ArchiveSessionSummary): ArchiveStatusFilter {
  const s: any = session as any;
  const feld = (s.feldolgozottsag as string | undefined) ?? "";
  const status = s.status as string | undefined;
  const archivedAt = s.archived_at as string | null | undefined;

  if (feld === "lezart" || status === "archived" || status === "closed" || Boolean(archivedAt)) return "lezart";
  if (feld === "vazlat" || feld === "erintett" || feld === "feldolgozott") return feld;

  return "vazlat";
}

function compact(text: string | null | undefined): string {
  return (text ?? "").trim().replace(/\s+/g, " ");
}

function titleOf(session: ArchiveSessionSummary): string {
  const s: any = session as any;

  const t = compact(s.title as string | null | undefined);
  if (t) return t;

  const raw = compact(s.raw_dream_text as string | null | undefined);
  if (!raw) return "Cím nélküli álom";

  return raw.length > 42 ? raw.slice(0, 41) + "…" : raw;
}

function getSnippet(session: ArchiveSessionSummary): string {
  const s: any = session as any;
  const raw = compact(s.raw_dream_text as string | undefined | null);
  if (!raw) return "";
  const max = 320; // ✅ kétszer hosszabb
  return raw.length > max ? raw.slice(0, max - 1) + "…" : raw;
}

/** status -> pill tokens (text + bg) */
function statusPillToken(status: ArchiveStatusFilter) {
  if (status === "erintett") return { text: "--status-erintett" as const, bg: "--status-erintett-bg" as const };
  if (status === "feldolgozott")
    return { text: "--status-feldolgozott" as const, bg: "--status-feldolgozott-bg" as const };
  if (status === "lezart") return { text: "--status-lezart" as const, bg: "--status-lezart-bg" as const };
  return { text: "--status-vazlat" as const, bg: "--status-vazlat-bg" as const };
}

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

export default function ArchiveClient() {
  const sp = useSearchParams();

  const status = parseStatus(sp.get("status") ?? undefined);
  const range = parseRange(sp.get("range") ?? undefined);
  const sort = parseSort(sp.get("sort") ?? undefined);
  const directions = (sp.get("directions") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 20);

  const { loading } = useRequireAuth();
  const [archiveData, setArchiveData] = useState<{
    summaries: ArchiveSessionSummary[];
    availableDirections: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [infoOpen, setInfoOpen] = useState(false);

  const seedRef = useRef<number>(0);
  if (!seedRef.current) seedRef.current = Math.floor(Date.now() % 2147483647);

  useEffect(() => {
    if (loading) return;

    let isMounted = true;

    async function loadArchive() {
      try {
        const userId = await requireUserId();
        const data = await fetchArchiveSessions(userId, range === "all" ? undefined : range);
        if (!isMounted) return;
        setArchiveData(data);
        setError(null);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError("Hiba történt az archívum betöltésekor.");
        setArchiveData({ summaries: [], availableDirections: [] });
      }
    }

    loadArchive();
    return () => {
      isMounted = false;
    };
  }, [loading, range]);

  const summaries = archiveData?.summaries ?? [];
  const availableDirections = archiveData?.availableDirections ?? [];
  const isLoading = loading || archiveData === null;

  const filtered = applyFilters(summaries, { status, directions });
  const sorted = applySort(filtered, sort);

  const availableStatuses = useMemo<ArchiveStatusFilter[]>(() => {
    const set = new Set<ArchiveStatusFilter>();
    for (const s of summaries) set.add(getComputedStatus(s));
    return ["vazlat", "erintett", "feldolgozott", "lezart"].filter((k) => set.has(k as any)) as ArchiveStatusFilter[];
  }, [summaries]);

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

  return (
    <Shell
      title="Álomnapló"
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
            Itt látod a korábban rögzített álmaidat, és gyorsan vissza tudsz térni egy régi sessionhöz.
          </p>

          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <li>Használd a szűrőket, ha egy időszakot, állapotot vagy irány-csoportot keresel.</li>
            <li>Az állapot segít látni, hol tart egy álom feldolgozása (vázlat → érintett → feldolgozott → lezárt).</li>
            <li>Kattints egy kártyára, és megnyílik a teljes session oldala.</li>
          </ul>

          <p style={{ color: "var(--text-muted)" }}>
            Tipp: ha csak gyorsan böngésznél, rendezd “Dátum szerint (újak elöl)”-re, és szűkíts 7 vagy 30 napra.
          </p>
        </div>
      }
    >
      <div className="stack">
        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <div className="archive-controls-wrap">
          <ArchiveControls
            availableDirections={availableDirections}
            availableStatuses={availableStatuses}
            selectedStatus={status}
            selectedDirections={directions}
            selectedRange={range}
            selectedSort={sort}
          />
        </div>

        {isLoading ? (
          <div className="stack">{Spinner}</div>
        ) : sorted.length === 0 ? (
          <Card muted>
            <p style={{ color: "var(--text-muted)" }}>Itt most nincs találat.</p>
          </Card>
        ) : (
          <div className="archive-grid">
            {sorted.map((session) => {
              const computedStatus = getComputedStatus(session);
              const snippet = getSnippet(session);

              const progressParts = [
                session.answered_cards_count ? `${session.answered_cards_count} kártya` : null,
                session.touched_directions_count ? `${session.touched_directions_count} irány` : null,
              ].filter(Boolean);
              const progress = progressParts.length ? progressParts.join(" · ") : "—";

              const stTok = statusPillToken(computedStatus);

              return (
                <Link key={session.id} href={`/session/${session.id}/summary`} style={{ textDecoration: "none" }}>
                  <GlassCardSurface
                    className="archive-tile"
                    variant="flat"
                    paper="evening"
                    corner={stTok.bg}
                  >
                    <div className="tile-top">
                      <div className="tile-left">
                        <div className="tile-title">{titleOf(session)}</div>

                        <Pill variant="neutral" colorVar={stTok.text} bgVar={stTok.bg}>
                          {formatStatusLabel(computedStatus)}
                        </Pill>
                      </div>

                      <div className="tile-right">{progress}</div>
                    </div>

                    {snippet ? (
                      <div className="tile-snippet">{snippet}</div>
                    ) : (
                      <div className="tile-snippet tile-snippet--empty" aria-hidden="true" />
                    )}

                    <div className="tile-bottom">
                      {session.touched_directions_count > 0 ? (
                        <div className="tile-meta">{session.touched_directions_count} érintett irány</div>
                      ) : (
                        <div className="tile-meta">—</div>
                      )}

                      <div className="tile-date">
                        {session.created_at ? new Date(session.created_at).toLocaleString("hu-HU") : ""}
                      </div>
                    </div>
                  </GlassCardSurface>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .archive-grid {
          display: grid;
          gap: var(--space-3);
          grid-template-columns: 1fr;
        }

        .archive-tile {
          cursor: pointer;
          border-radius: 18px;
          
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;

          padding: var(--space-4);
          min-height: 170px;

          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .archive-tile:hover {
          transform: scale(1.02);
        }

        .tile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          flex: 0 0 auto;
        }

        .tile-left {
          display: flex;
          gap: var(--space-2);
          align-items: center;
          flex-wrap: wrap;
          min-width: 0;
        }

        .tile-title {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.015em;
          line-height: 1.12;
        }

        .tile-right {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .tile-snippet {
          margin-top: 10px;
          font-size: 14px;
          color: var(--text-muted);
          opacity: 0.78;
          white-space: pre-wrap;
          line-height: 1.55;
          flex: 1 1 auto;
        }

        .tile-snippet--empty {
          margin-top: 0;
        }

        .tile-bottom {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: var(--space-3);
          margin-top: 10px;
          flex: 0 0 auto;
        }

        .tile-meta {
          font-size: 12px;
          color: var(--text-muted);
          opacity: 0.65;
        }

        .tile-date {
          font-size: 12px;
          color: var(--text-muted);
          opacity: 0.7;
          white-space: nowrap;
        }

        .archive-controls-wrap :global(.filters) {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-3);
        }
        @media (min-width: 760px) {
          .archive-controls-wrap :global(.filters) {
            grid-template-columns: 1fr 1fr 1fr;
            align-items: start;
          }
        }

        .archive-controls-wrap :global(.directions),
        .archive-controls-wrap :global(.directions-wrap),
        .archive-controls-wrap :global(.direction-pills),
        .archive-controls-wrap :global(.directions-row) {
          grid-column: 1 / -1;
        }
      `}</style>
    </Shell>
  );
}
