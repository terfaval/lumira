"use client";

import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";

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
        <div className="flow-overlay-grid">
          <div className="flow-overlay-icon" aria-hidden="true">
            <LumiraLoader size={44} tone="light" />
          </div>

          <div className="flow-overlay-text">
            <div className="flow-overlay-title">{title}</div>
            <div className="flow-overlay-subtitle">{subtitle}</div>
          </div>
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
          width: min(560px, 92vw);
          border-radius: 18px;
          padding: var(--space-4); /* bigger padding */
        }

        .flow-overlay-grid {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: var(--space-3);
          align-items: center;
        }

        .flow-overlay-icon {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
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
      `}</style>
    </div>
  );
}
