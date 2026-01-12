"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./GlassCardSurface.module.css";

type CornerVar = `--${string}` | string;

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;

  /** Optional corner accent source (CSS var or literal color). */
  corner?: CornerVar | null;

  /** Corner intensity mode. */
  cornerMode?: "soft" | "accent";

  /** Paper preset. Optional, defaults to "evening". */
  paper?: "evening" | "plain";

  /** Toggle glossy sheen overlay. Default true. */
  gloss?: boolean;

  /** Toggle grain/noise overlay. Default true. */
  grain?: boolean;

  /** Optional override for the "soft" corner fallback color. */
  cornerSoftFallback?: string;

  /** Min height, defaults to 60vh (EveningCardFlip parity). */
  minHeight?: string;
};

function cx(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(" ");
}

type ForegroundProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Recommended wrapper for interactive content (textarea/input/select/buttons),
 * so they always sit above overlays and can be styled "matte".
 */
export function GlassCardForeground({ children, className, style }: ForegroundProps) {
  return (
    <div className={cx(styles.foreground, className)} style={style}>
      {children}
    </div>
  );
}

export function GlassCardSurface({
  children,
  className,
  style,
  corner = null,
  cornerMode = "accent",
  paper = "evening",
  gloss = true,
  grain = true,
  cornerSoftFallback = "rgba(255,255,255,0.06)",
  minHeight = "60vh",
}: Props) {
  const cornerIsVar = Boolean(corner && corner.startsWith("--"));
  const cornerValue = corner ? (cornerIsVar ? `var(${corner})` : corner) : null;

  const cornerAccent = cornerValue ?? "rgba(0,0,0,0)";

  // Soft corner:
  // - if corner is a CSS var: use provided fallback (we can't compute a mix reliably)
  // - if literal color: use CSS color-mix when supported (CSS handles fallback via @supports in module)
  const softLiteral = cornerValue ? `color-mix(in srgb, ${cornerValue} 30%, transparent)` : "transparent";
  const cornerSoft = corner
    ? cornerIsVar
      ? cornerSoftFallback
      : softLiteral
    : "rgba(0,0,0,0)";

  const bgCorner = cornerMode === "soft" ? cornerSoft : cornerAccent;

  const background =
    paper === "evening"
      ? `linear-gradient(135deg,
          var(--evening-card-paper-strong) 0%,
          var(--evening-card-paper) 42%,
          ${bgCorner} 110%)`
      : `linear-gradient(135deg,
          rgba(255,255,255,0.10) 0%,
          rgba(255,255,255,0.06) 44%,
          ${bgCorner} 110%)`;

  return (
    <div
      className={cx(styles.surface, !gloss && styles.glossOff, !grain && styles.grainOff, className)}
      style={{ ...style, background, minHeight }}
      data-paper={paper}
      data-corner-mode={cornerMode}
    >
      {children}
    </div>
  );
}
