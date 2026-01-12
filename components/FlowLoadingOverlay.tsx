"use client";

import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

export function FlowLoadingOverlay({
  open,
  title = "Betöltés…",
  subtitle = "Egy pillanat…",
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!open) return null;

  return (
    <div className="flow-overlay" role="status" aria-live="polite" aria-label={title}>
      <GlassCardSurface className="flow-overlay-card" variant="soft" paper="evening">
        <div className="spinner" aria-hidden="true" />
        <div className="flow-overlay-text">
          <div className="flow-overlay-title">{title}</div>
          <div className="flow-overlay-subtitle">{subtitle}</div>
        </div>
      </GlassCardSurface>

      <style jsx>{`
        .flow-overlay {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: var(--space-4);
          z-index: 100;
          background: rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(6px);
        }

        .flow-overlay-card {
          width: min(520px, 92vw);
          border-radius: 18px;
          padding: var(--space-3);
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }

        .spinner {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-top-color: var(--accent);
          animation: spin 0.9s linear infinite;
          flex: 0 0 auto;
        }

        .flow-overlay-text {
          display: grid;
          gap: var(--space-1);
          min-width: 0;
        }

        .flow-overlay-title {
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .flow-overlay-subtitle {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
