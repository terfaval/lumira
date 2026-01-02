"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/Card";
import { Shell } from "@/components/Shell";
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

const rangeOptions: RangeOption[] = ["all", "7", "30", "90", "365"];
const sortOptions: SortOption[] = ["date_desc", "date_asc", "score_desc", "score_asc"];

type ArchiveStatusFilter = Feldolgozottsag | "lezart";

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

function applyFilters(
  sessions: ArchiveSessionSummary[],
  filters: { status?: ArchiveStatusFilter; directions: string[] }
) {
  return sessions.filter((session) => {
    if (filters.status) {
      const computed = getComputedStatus(session);
      if (computed !== filters.status) return false;
    }

    if (
      filters.directions.length > 0 &&
      !session.touched_directions.some((slug) => filters.directions.includes(slug))
    ) {
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

function getSnippet(session: ArchiveSessionSummary): string {
  const s: any = session as any;
  const raw = (s.raw_dream_text as string | undefined | null) ?? "";
  const t = raw.trim();
  if (!t) return "";
  const cut = t.slice(0, 160);
  return t.length > 160 ? `${cut}…` : cut;
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

  // összecsukás: mely csoportok nyitottak
  const [openGroups, setOpenGroups] = useState<Record<ArchiveStatusFilter, boolean>>({
    vazlat: true,
    erintett: true,
    feldolgozott: true,
    lezart: true,
  });

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

  const groups = [
    { key: "vazlat" as const, title: "Vázlatok" },
    { key: "erintett" as const, title: "Érintettek" },
    { key: "feldolgozott" as const, title: "Feldolgozottak" },
    { key: "lezart" as const, title: "Lezártak" },
  ];

  const grouped = groups
    .map((g) => ({
      ...g,
      items: sorted.filter((s) => getComputedStatus(s) === g.key),
    }))
    .filter((g) => g.items.length > 0);

  // státusz dropdown opciók: csak amik tényleg jelen vannak a felhasználónál
  const availableStatuses = useMemo<ArchiveStatusFilter[]>(() => {
    const set = new Set<ArchiveStatusFilter>();
    for (const s of summaries) set.add(getComputedStatus(s));
    return ["vazlat", "erintett", "feldolgozott", "lezart"].filter((k) => set.has(k as any)) as ArchiveStatusFilter[];
  }, [summaries]);

  function toggleGroup(key: ArchiveStatusFilter) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Shell title="Álmonapló">
      <div className="stack">
        <p style={{ color: "var(--text-muted)" }}>Itt látod a korábban rögzített álmaid összképét.</p>

        <ArchiveControls
          availableDirections={availableDirections}
          availableStatuses={availableStatuses}
          selectedStatus={status}
          selectedDirections={directions}
          selectedRange={range}
          selectedSort={sort}
        />

        {isLoading ? (
          <Card muted>
            <p style={{ color: "var(--text-muted)" }}>Betöltés...</p>
          </Card>
        ) : error ? (
          <Card muted>
            <p style={{ color: "var(--text-muted)" }}>{error}</p>
          </Card>
        ) : sorted.length === 0 ? (
          <Card muted>
            <p style={{ color: "var(--text-muted)" }}>Itt most nincs találat.</p>
          </Card>
        ) : (
          <div className="stack">
            {grouped.map((group) => {
              const isOpen = openGroups[group.key];

              return (
                <div key={group.key} className="stack">
                  {/* fejléc: kattintható összecsukás */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    aria-expanded={isOpen}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.2, color: "var(--text-muted)" }}>
                      {group.title} · {group.items.length}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, opacity: 0.8 }}>
                      {isOpen ? "▾" : "▸"}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="stack">
                      {group.items.map((session) => {
                        const computedStatus = getComputedStatus(session);
                        const snippet = getSnippet(session);

                        const progressParts = [
                          session.answered_cards_count ? `${session.answered_cards_count} kártya` : null,
                          session.touched_directions_count ? `${session.touched_directions_count} irány` : null,
                        ].filter(Boolean);
                        const progress = progressParts.length ? progressParts.join(" · ") : "—";

                        return (
                          <Link key={session.id} href={`/session/${session.id}`} style={{ textDecoration: "none" }}>
                            <Card>
                              <div className="stack-tight">
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    alignItems: "baseline",
                                  }}
                                >
                                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                                    <div style={{ fontWeight: 800 }}>{session.title}</div>
                                    <span className="badge-muted">{formatStatusLabel(computedStatus)}</span>
                                  </div>

                                  <div style={{ color: "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                                    {progress}
                                  </div>
                                </div>

                                {/* snippet: akkor látszik, ha a fetchArchiveSessions tényleg hozza a raw_dream_text-et */}
                                {snippet ? (
                                  <div style={{ opacity: 0.7, whiteSpace: "pre-wrap" }}>{snippet}</div>
                                ) : null}

                                {session.touched_directions_count > 0 && (
                                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                                    {session.touched_directions_count} érintett irány
                                  </div>
                                )}

                                <div style={{ fontSize: 12, opacity: 0.65 }}>
                                  {new Date(session.created_at).toLocaleString("hu-HU")}
                                </div>
                              </div>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
