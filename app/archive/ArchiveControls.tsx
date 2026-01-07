"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Feldolgozottsag, RangeOption, SortOption } from "@/src/lib/archive";

type ArchiveStatusFilter = Feldolgozottsag | "lezart";

const rangeOptions = [
  { value: "all", label: "Időszak: Mind" },
  { value: "7", label: "Utolsó 7 nap" },
  { value: "30", label: "Utolsó 30 nap" },
  { value: "90", label: "Utolsó 90 nap" },
  { value: "365", label: "Utolsó év" },
] as const;

const sortOptions = [
  { value: "date_desc", label: "Dátum szerint (újak elöl)" },
  { value: "date_asc", label: "Dátum szerint (régiek elöl)" },
  { value: "score_desc", label: "Feldolgozottság szerint" },
  { value: "score_asc", label: "Feldolgozottság szerint (növekvő)" },
] as const;

type ArchiveControlsProps = {
  availableDirections: string[];
  availableStatuses: ArchiveStatusFilter[];
  selectedStatus?: ArchiveStatusFilter;
  selectedDirections: string[];
  selectedRange: RangeOption;
  selectedSort: SortOption;
};

export default function ArchiveControls({
  availableDirections,
  availableStatuses,
  selectedStatus,
  selectedDirections,
  selectedRange,
  selectedSort,
}: ArchiveControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedDirectionSet = useMemo(() => new Set(selectedDirections), [selectedDirections]);

  function updateSearch(newValues: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    Object.entries(newValues).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function handleStatusChange(value: string) {
    updateSearch({ status: value || null });
  }

  function handleRangeChange(value: string) {
    updateSearch({ range: value === "all" ? null : value });
  }

  function handleSortChange(value: string) {
    updateSearch({ sort: value === "date_desc" ? null : value });
  }

  function toggleDirection(slug: string) {
    const next = new Set(selectedDirectionSet);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);

    const combined = Array.from(next);
    updateSearch({ directions: combined.length ? combined.join(",") : null });
  }

  const show = (s: ArchiveStatusFilter) => availableStatuses.includes(s);

  return (
    <div className="card controls">
      <div className="filters">
        <div className="filter">
          <div className="filter-label">Állapot</div>
          <select className="select" value={selectedStatus ?? ""} onChange={(e) => handleStatusChange(e.target.value)}>
            <option value="">Mind</option>
            {show("vazlat") && <option value="vazlat">Vázlat</option>}
            {show("erintett") && <option value="erintett">Érintett</option>}
            {show("feldolgozott") && <option value="feldolgozott">Feldolgozott</option>}
            {show("lezart") && <option value="lezart">Lezárt</option>}
          </select>
        </div>

        <div className="filter">
          <div className="filter-label">Időszak</div>
          <select className="select" value={selectedRange} onChange={(e) => handleRangeChange(e.target.value)}>
            {rangeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter">
          <div className="filter-label">Rendezés</div>
          <select className="select" value={selectedSort} onChange={(e) => handleSortChange(e.target.value)}>
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="directions">
        <div className="directions-head">
          <div className="filter-label">Irányok</div>
          <span className="or">OR</span>
        </div>

        {availableDirections.length === 0 ? (
          <span style={{ color: "var(--text-muted)" }}>Még nincs érintett irány.</span>
        ) : (
          <div className="direction-badges">
            {availableDirections.map((slug) => {
              const checked = selectedDirectionSet.has(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  className="badge-muted"
                  onClick={() => toggleDirection(slug)}
                  style={{
                    borderColor: checked ? "var(--accent)" : undefined,
                    color: checked ? "var(--accent)" : undefined,
                  }}
                >
                  {checked ? "✓ " : ""}
                  {slug}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .controls {
          display: grid;
          gap: 10px;
          padding: 12px;
        }

        /* ugyanaz a logika, mint az evening filters */
        .filters {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          align-items: end;
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
          font-weight: 600;
        }

        .directions {
          display: grid;
          gap: 6px;
        }

        .directions-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .or {
          color: var(--text-muted);
          font-size: 12px;
        }

        .direction-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}
