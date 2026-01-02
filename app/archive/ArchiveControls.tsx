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
  availableStatuses: ArchiveStatusFilter[]; // ✅ ez hiányzott
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
    <div className="card" style={{ display: "grid", gap: 10, padding: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Állapot</label>
          <select
            className="input-field"
            value={selectedStatus ?? ""}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Mind</option>
            {show("vazlat") && <option value="vazlat">Vázlat</option>}
            {show("erintett") && <option value="erintett">Érintett</option>}
            {show("feldolgozott") && <option value="feldolgozott">Feldolgozott</option>}
            {show("lezart") && <option value="lezart">Lezárt</option>}
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Időszak</label>
          <select className="input-field" value={selectedRange} onChange={(e) => handleRangeChange(e.target.value)}>
            {rangeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Rendezés</label>
          <select className="input-field" value={selectedSort} onChange={(e) => handleSortChange(e.target.value)}>
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Irányok</label>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>OR</span>
        </div>

        {availableDirections.length === 0 ? (
          <span style={{ color: "var(--text-muted)" }}>Még nincs érintett irány.</span>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
    </div>
  );
}
