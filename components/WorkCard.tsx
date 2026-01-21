// /components/WorkCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { DirectionCardContent } from "@/src/lib/types";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";

type GroupKey = "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";

function groupKeyFromLabel(raw: unknown): GroupKey {
  const label = String(raw ?? "").trim().toLowerCase();
  if (label.includes("álomemlékezet")) return "memory";
  if (label.includes("érzelmi") || label.includes("testi")) return "somatic";
  if (label.includes("mintázat")) return "patterns";
  if (label.includes("jelent")) return "meaning";
  if (label.includes("kreatív")) return "creative";
  return "other";
}

function groupToken(k: GroupKey) {
  return { text: `--dirgroup-${k}` as const, bg: `--dirgroup-${k}-bg` as const };
}

export function WorkCard({
  mode,
  block,
  directionMeta,
  busy,
  onSave,
  onOpen,
  sessionId,
}: {
  mode: "edit" | "read";
  block: { id: string; content: DirectionCardContent };
  directionMeta: DirectionCatalogItemDTO | null;
  busy: boolean;

  // edit
  onSave?: (answer: string) => Promise<void>;

  // read / navigate
  onOpen?: () => void;
  sessionId?: string;
}) {
  const c = block.content;

  const group = directionMeta?.content?.group;
  const gKey = useMemo(() => groupKeyFromLabel(group), [group]);
  const token = useMemo(() => groupToken(gKey), [gKey]);

  const context = String(c.ai?.context ?? "").trim();
  const prompt = String(c.ai?.prompt ?? c.ai?.question ?? "").trim();

  const initial = String(c.user?.answer ?? "");
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    setDraft(String(c.user?.answer ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, c.user?.answered_at, c.user?.answer]);

  const answered = Boolean(String(c.user?.answer ?? "").trim()) || c.state === "answered";
  const canClick = mode === "read" && !!onOpen;

  return (
    <div
      className={`workcard-root ${canClick ? "is-clickable" : ""} ${mode === "edit" ? "is-edit" : "is-read"}`}
      role={canClick ? "button" : undefined}
      tabIndex={canClick ? 0 : undefined}
      aria-label={canClick ? "Kártya megnyitása" : undefined}
      onClick={canClick ? onOpen : undefined}
      onKeyDown={
        canClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      style={{ cursor: canClick ? "pointer" : "default" }}
    >
      <GlassCardSurface
        className="workcard-surface"
        variant="soft"
        paper="evening"
        corner={token.bg}
        style={{
          padding: "var(--space-4)",
        }}
      >
        <div className="workcard-body">
          {context ? <div className="workcard-context">{context}</div> : null}

          {prompt ? <div className="workcard-question">{prompt}</div> : null}

          {mode === "edit" ? (
            <textarea
              className="workcard-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              placeholder="Fejtsd ki szabadon"
            />
          ) : (
            <div className={`workcard-answerBox ${answered ? "is-answered" : "is-empty"}`}>
              {answered ? String(c.user?.answer ?? "") : "Nincs válasz"}
            </div>
          )}
        </div>

        {mode === "edit" ? (
          <>
            <div style={{ height: "var(--space-4)" }} />

            <div className="workcard-actions">
              <Link href="/archive" style={{ textDecoration: "none" }}>
                <PrimaryButton variant="secondary" disabled={busy}>
                  Később folytatom
                </PrimaryButton>
              </Link>

              <PrimaryButton onClick={() => onSave?.(draft)} disabled={busy} aria-label="Válasz rögzítése">
                Rögzítés
              </PrimaryButton>
            </div>
          </>
        ) : null}
      </GlassCardSurface>

      <style jsx>{`
        .workcard-body {
          display: grid;
          gap: var(--space-3);
        }

        .workcard-context {
          white-space: pre-wrap;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.65;
        }

        .workcard-question {
          font-weight: 880;
          font-size: 18px;
          letter-spacing: -0.01em;
          line-height: 1.25;
          color: var(--text-primary);
        }

        .workcard-input {
          margin-top: 2px;
          padding: 14px 14px;
          border-radius: 16px;
          border: 1px solid var(--line-soft);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          line-height: 1.6;
          resize: vertical;
        }

        .workcard-answerBox {
          margin-top: 2px;
          padding: 14px 14px;
          border-radius: 16px;
          border: 1px solid var(--line-soft);
          background: rgba(255, 255, 255, 0.03);
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .workcard-answerBox.is-answered {
          color: var(--text-primary);
        }

        .workcard-answerBox.is-empty {
          color: var(--text-muted);
        }

        .workcard-actions {
          display: flex;
          gap: var(--space-2);
          justify-content: flex-end;
          flex-wrap: wrap;
          align-items: center;
        }

        /* READ interaction (tile-szerű) */
        .workcard-root.is-clickable :global(.workcard-surface) {
          transition: transform 160ms ease, box-shadow 160ms ease;
          will-change: transform;
        }

        .workcard-root.is-clickable:hover :global(.workcard-surface) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        }

        .workcard-root.is-clickable:active :global(.workcard-surface) {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
        }

        .workcard-root.is-clickable:focus-visible :global(.workcard-surface) {
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08), 0 10px 30px rgba(0, 0, 0, 0.28);
        }
      `}</style>
    </div>
  );
}
