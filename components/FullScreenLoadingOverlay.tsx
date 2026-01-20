"use client";

import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";

export function FullScreenLoadingOverlay({
  open,
  title = "Betöltés…",
  subtitle,
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!open) return null;

  return (
    <div className="fs-loading" role="status" aria-live="polite" aria-label={title}>
      <div className="fs-loading-center">
        <LumiraLoader size={96} tone="light" />

        <div className="fs-loading-text">
          <div className="fs-loading-title">{title}</div>
          {subtitle ? <div className="fs-loading-subtitle">{subtitle}</div> : null}
        </div>
      </div>

      <style jsx>{`
        .fs-loading {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: var(--space-4);
          background: rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(10px);
        }

        .fs-loading-center {
          display: grid;
          place-items: center;
          gap: var(--space-3);
          text-align: center;
          width: min(560px, 92vw);
        }

        .fs-loading-text {
          display: grid;
          gap: var(--space-1);
          min-width: 0;
        }

        .fs-loading-title {
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .fs-loading-subtitle {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
