// /components/GlassCardSurface/GlassCardSurface.tsx
"use client";

import type { CSSProperties, ReactNode, HTMLAttributes } from "react";
import styles from "./GlassCardSurface.module.css";

type CornerVar = `--${string}` | string;

function cx(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(" ");
}

export type GlassCardPaper = "evening" | "plain";
export type GlassCardVariant = "hero" | "soft" | "flat";

export type GlassCardSurfaceProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;

  /** Visual preset. Default: "soft" */
  variant?: GlassCardVariant;

  /** Background preset. Default: "evening" */
  paper?: GlassCardPaper;

  /** Optional corner accent source (CSS var like "--accent" or literal color). */
  corner?: CornerVar | null;

  /** Corner intensity mode. Default: "accent" */
  cornerMode?: "soft" | "accent";

  /** Toggle glossy highlight overlay. If omitted, variant decides. */
  gloss?: boolean;

  /** Toggle grain/noise overlay. If omitted, variant decides. */
  grain?: boolean;

  /** Optional override for the "soft" corner fallback color (used when corner is a CSS var). */
  cornerSoftFallback?: string;

  /** Min height. Default: "60vh" (hero parity). */
  minHeight?: string;
} & HTMLAttributes<HTMLDivElement>;

export type GlassCardForegroundProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Recommended wrapper for interactive content (textarea/input/select/buttons),
 * so it always sits above overlays.
 */
export function GlassCardForeground({ children, className, style }: GlassCardForegroundProps) {
  return (
    <div className={cx(styles.foreground, className)} style={style}>
      {children}
    </div>
  );
}

export type GlassCardMatteProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;

  /** Visual tone for the matte well. Default: "evening" */
  tone?: "evening" | "plain";

  /** Inner padding size. Default: "md" */
  padding?: "sm" | "md" | "lg";
};

/**
 * Matte “paper well” to place inside a glass surface.
 * Use this around inputs/textareas/editors so they do NOT inherit the glass sheen.
 */
export function GlassCardMatte({
  children,
  className,
  style,
  tone = "evening",
  padding = "md",
}: GlassCardMatteProps) {
  return (
    <div
      className={cx(
        styles.matte,
        tone === "plain" && styles.matteTonePlain,
        padding === "sm" && styles.mattePadSm,
        padding === "md" && styles.mattePadMd,
        padding === "lg" && styles.mattePadLg,
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

function variantDefaults(variant: GlassCardVariant) {
  // Defaults chosen to keep EveningCardFlip "hero"-ish, and app-wide surfaces calmer.
  switch (variant) {
    case "hero":
      return { gloss: true, grain: true, minHeight: "60vh" };
    case "soft":
      return { gloss: true, grain: true, minHeight: "auto" };
    case "flat":
      return { gloss: false, grain: false, minHeight: "auto" };
  }
}

export function GlassCardSurface({
  children,
  className,
  style,
  variant = "soft",
  paper = "evening",
  corner = null,
  cornerMode = "accent",
  gloss,
  grain,
  cornerSoftFallback = "rgba(255,255,255,0.06)",
  minHeight,
  ...rest
}: GlassCardSurfaceProps) {
  const vd = variantDefaults(variant);
  const finalGloss = gloss ?? vd.gloss;
  const finalGrain = grain ?? vd.grain;
  const finalMinHeight = minHeight ?? vd.minHeight;

  const cornerIsVar = Boolean(corner && corner.startsWith("--"));
  const cornerValue = corner ? (cornerIsVar ? `var(${corner})` : corner) : null;

  const cornerAccent = cornerValue ?? "rgba(0,0,0,0)";

  // Soft corner:
  // - if corner is a CSS var: use fallback (we can't compute a mix reliably)
  // - if literal color: use CSS color-mix (browsers without support may ignore that stop; gradient still renders)
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
      className={cx(
        styles.surface,
        variant === "hero" && styles.variantHero,
        variant === "soft" && styles.variantSoft,
        variant === "flat" && styles.variantFlat,
        !finalGloss && styles.glossOff,
        !finalGrain && styles.grainOff,
        className
      )}
      style={{ ...style, background, minHeight: finalMinHeight }}
      data-paper={paper}
      data-variant={variant}
      data-corner-mode={cornerMode}
      {...rest}
    >
      {children}
    </div>
  );
}
