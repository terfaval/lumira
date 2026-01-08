"use client";

export function FlowLoadingOverlay({
  open,
  title = "Előkészítés…",
  subtitle = "Cím, keret és ajánlások készülnek. Ez általában csak pár pillanat.",
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!open) return null;

  return (
    <div className="flow-loading-overlay" role="status" aria-live="polite" aria-label="Betöltés">
      <div className="flow-loading-card">
        <div className="flow-loading-spinner" aria-hidden="true" />
        <div className="stack-tight" style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ color: "var(--text-muted)", lineHeight: 1.55 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
