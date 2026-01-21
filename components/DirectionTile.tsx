// /components/DirectionTile.tsx
"use client";

import { Pill } from "@/components/Pill";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import styles from "./DirectionTile.module.css";
import type { DirectionCatalogItem } from "@/src/lib/types";

type Props = {
  dir: DirectionCatalogItem;

  groupKey: "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";
  groupLabel: string;
  token: { text: `--dirgroup-${string}`; bg: `--dirgroup-${string}-bg` };

  tags: string[];

  /** Default: full tile. Minimal: no pills/tags/hint. */
  variant?: "default" | "minimal";

  /** Show star pill (only if you want) */
  showReco?: boolean;

  /**
   * Why / reason text. In "default" it's shown under title when showReco=true.
   * In "minimal" it's used as the main body if present.
   */
  why?: string | null;

  /** Fine-grain toggles (default true in "default" variant) */
  showGroupPill?: boolean;
  showTags?: boolean;
  showHint?: boolean;

  onOpen: (slug: string, originRect?: DOMRect) => void;
};

export function DirectionTile({
  dir,
  groupLabel,
  token,
  tags,
  variant = "default",
  showReco = false,
  why = null,
  showGroupPill,
  showTags,
  showHint,
  onOpen,
}: Props) {
  const micro = ((dir as any)?.content?.micro_description ?? dir.description ?? "") as string;
  const whyText = String(why ?? "").trim();

  // Defaults by variant
  const _showGroupPill = showGroupPill ?? (variant === "default");
  const _showTags = showTags ?? (variant === "default");
  const _showHint = showHint ?? (variant === "default");

  function openFrom(el: HTMLElement | null) {
    const rect = el?.getBoundingClientRect();
    onOpen(dir.slug, rect);
  }

  // Minimal: keep color (corner), but remove pills/tags/hint entirely.
  if (variant === "minimal") {
    const body = (whyText || micro || "").trim();

    return (
      <GlassCardSurface
        className={`${styles.wrap} ${styles.card}`}
        role="button"
        tabIndex={0}
        variant="soft"
        paper="evening"
        corner={token?.bg ?? null}
        onClick={(e) => openFrom(e.currentTarget as HTMLElement)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFrom(e.currentTarget as HTMLElement);
          }
        }}
      >
        <div className={styles.mid}>
          <div className={styles.title}>{dir.title}</div>
          {body ? <div className={styles.body}>{body}</div> : null}
        </div>
      </GlassCardSurface>
    );
  }

  // Default (full tile)
  return (
    <GlassCardSurface
      className={`${styles.wrap} ${styles.card}`}
      role="button"
      tabIndex={0}
      variant="soft"
      paper="evening"
      corner={token?.bg ?? null}
      onClick={(e) => openFrom(e.currentTarget as HTMLElement)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFrom(e.currentTarget as HTMLElement);
        }
      }}
    >
      {/* TOP */}
      {_showGroupPill || showReco ? (
        <div className={styles.top}>
          <div className={styles.left}>
            {_showGroupPill ? (
              <Pill variant="neutral" colorVar={token.text} bgVar={token.bg}>
                {groupLabel}
              </Pill>
            ) : null}
          </div>

          {showReco ? (
            <div className={styles.right}>
              <Pill variant="neutral">★ Ajánlott</Pill>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* MID */}
      <div className={styles.mid}>
        <div className={styles.title}>{dir.title}</div>

        {showReco && whyText ? <div className={styles.why}>{whyText}</div> : null}

        {micro ? <div className={styles.body}>{micro}</div> : null}
      </div>

      {/* BOTTOM */}
      {_showTags || _showHint ? (
        <div className={styles.bottom}>
          {_showTags && tags.length
            ? tags.map((t) => (
                <Pill key={t} variant="neutral">
                  {t}
                </Pill>
              ))
            : null}

          {_showHint ? (
            <span className={styles.hint}>
              Megnyitás <span aria-hidden="true">→</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </GlassCardSurface>
  );
}
