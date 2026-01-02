"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function parseStatus(value: string | undefined): Feldolgozottsag | undefined {
  if (value === "vazlat" || value === "erintett" || value === "feldolgozott") return value;
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
  filters: {
    status?: Feldolgozottsag;
    directions: string[];
  }
) {
  return sessions.filter((session) => {
    if (filters.status && session.feldolgozottsag !== filters.status) return false;
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
    if (sort === "date_desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sort === "date_asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

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

function DirectionChips({ slugs }: { slugs: string[] }) {
  if (slugs.length === 0) {
    return <span className="badge-muted">Nincs érintett irány</span>;
  }

  const primary = slugs.slice(0, 2);
  const extra = slugs.length - primary.length;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {primary.map((slug) => (
        <span key={slug} className="badge-muted">
          {slug}
        </span>
      ))}
      {extra > 0 && <span className="badge-muted">+{extra}</span>}
    </div>
  );
}

export default function ArchivePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const status = parseStatus(searchParams.status as string | undefined);
  const range = parseRange(searchParams.range as string | undefined);
  const sort = parseSort(searchParams.sort as string | undefined);
  const directions =
    (searchParams.directions as string | undefined)?.split(",").filter(Boolean).slice(0, 20) ?? [];

  const { loading } = useRequireAuth();
  const [archiveData, setArchiveData] = useState<{
    summaries: ArchiveSessionSummary[];
    availableDirections: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Shell title="Álmonapló">
      <div className="stack">
        <p style={{ color: "var(--text-muted)" }}>
          Itt látod a korábban rögzített álmaid összképét.
        </p>

        <ArchiveControls
          availableDirections={availableDirections}
          selectedStatus={status}
          selectedDirections={directions}
          selectedRange={range}
          selectedSort={sort}
        />

        <div className="meta-block">
          <span className="badge-muted">{summaries.length} összesen</span>
          <span className="badge-muted">{sorted.length} találat</span>
          <Link className="badge-muted" href="/">
            Vissza
          </Link>
        </div>

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
            {sorted.map((session) => (
              <Card key={session.id}>
                <div className="stack-tight">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "baseline",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{session.title}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {new Date(session.created_at).toLocaleDateString("hu-HU")}
                    </div>
                  </div>

                  <DirectionChips slugs={session.touched_directions} />

                  <div className="meta-block">
                    <span className="badge-muted">{session.feldolgozottsag}</span>
                    <span className="badge-muted">{session.touched_directions_count} irány</span>
                    <span className="badge-muted">{session.answered_cards_count} kártya</span>
                    <span className="badge-muted">{session.score} pont</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
