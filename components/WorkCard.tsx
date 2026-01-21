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
  sessionId?: string;

  // read / navigate
  onOpen?: () => void;
}) {
  const c = block.content;

  const group = directionMeta?.content?.group;
  const gKey = useMemo(() => groupKeyFromLabel(group), [group]);
  const token = useMemo(() => groupToken(gKey), [gKey]);

  const title = directionMeta?.title ?? c.direction_slug ?? "Irány";
  const groupLabel = String(group ?? "").trim() || "Egyéb";

  const context = String(c.ai?.context ?? "").trim();
  const question = String(c.ai?.question ?? "").trim();

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
      aria-label={canClick ? `Megnyitás: ${title}` : undefined}
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
        {/* HEADER */}
        <div className="workcard-header">
          <div className="workcard-titleRow">
            <div className="workcard-title" title={title}>
              {title}
            </div>

            <div className="workcard-state">{answered ? "Megválaszolt" : "Megnyitott"}</div>
          </div>

          <div className="workcard-metaRow">
            <span
              className="workcard-badge"
              style={{
                borderColor: `var(${token.text})`,
                background: `var(${token.bg})`,
                color: `var(${token.text})`,
              }}
              title={groupLabel}
            >
              {groupLabel}
            </span>
          </div>
        </div>

        <div style={{ height: "var(--space-3)" }} />

        {/* BODY */}
        <div className="workcard-body">
          {context ? <div className="workcard-context">{context}</div> : null}

          {question ? <div className="workcard-question">{question}</div> : null}

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

        {/* ACTIONS (edit only) */}
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
        .workcard-root {
          outline: none;
        }

        .workcard-header {
          display: grid;
          gap: 8px;
        }

        .workcard-titleRow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-3);
          min-width: 0;
        }

        .workcard-title {
          font-weight: 880;
          letter-spacing: -0.01em;
          line-height: 1.15;
          color: var(--text-primary);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .workcard-state {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          opacity: 0.95;
          padding-top: 2px;
        }

        .workcard-metaRow {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .workcard-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          line-height: 1;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid var(--line-soft);
          white-space: nowrap;
          opacity: 0.95;
        }

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

        /* READ interaction – mint a DirectionTile: finom lift + highlight */
        .workcard-root.is-clickable :global(.workcard-surface) {
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
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
