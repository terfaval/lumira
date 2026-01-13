"use client";

import type { CSSProperties, ReactNode, HTMLAttributes } from "react";
import styles from "./GlassCardSurface.module.css";

type CornerVar = `--${string}` | string;

function cx(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(" ");
}

export type GlassCardPaper = "evening" | "plain";
export type GlassCardVariant = "hero" | "soft" | "flat";

export type GlassCardHoverPreset = "none" | "lift" | "glow";

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

  /** Min height. Default: variant decides. */
  minHeight?: string;

  /* ─────────────────────────────────────────────
     NEW: gradient direction + stops (optional)
     ───────────────────────────────────────────── */

  /** Background gradient angle. Default: 135 */
  angle?: number;

  /** Gradient stops (percent). Default: 0 / 42 / 110 (your current behavior) */
  stop1?: number; // usually 0
  stop2?: number; // usually 42-48
  stop3?: number; // usually 110+

  /* ─────────────────────────────────────────────
     NEW: interaction model (optional)
     ───────────────────────────────────────────── */

  /** Enables built-in hover/active effects on the surface itself. Default: false */
  interactive?: boolean;

  /** Quick preset. Default: "none" */
  hover?: GlassCardHoverPreset;

  /** Fine-tune hover behavior (only if interactive=true). */
  hoverScale?: number;      // e.g. 1.04
  hoverLift?: number;       // px, e.g. 2
  hoverSaturate?: number;   // e.g. 1.12
  hoverBrightness?: number; // e.g. 1.04

  /** Glow toggle for hover (only if interactive=true). Default depends on hover preset. */
  hoverGlow?: boolean;

  /** Glow colors (CSS vars recommended). Defaults: --accent and --accent-2 */
  glowA?: CornerVar; // default: --accent
  glowB?: CornerVar; // default: --accent-2

  /** Optional hover text + border colors (CSS vars recommended). */
  hoverText?: CornerVar;   // default: --accent-ink
  hoverBorder?: CornerVar; // default: --accent-2
} & HTMLAttributes<HTMLDivElement>;

export type GlassCardForegroundProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

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
  tone?: "evening" | "plain";
  padding?: "sm" | "md" | "lg";
};

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
  switch (variant) {
    case "hero":
      return { gloss: true, grain: true, minHeight: "60vh" };
    case "soft":
      return { gloss: true, grain: true, minHeight: "auto" };
    case "flat":
      return { gloss: false, grain: false, minHeight: "auto" };
  }
}

function asVarOrColor(v?: CornerVar | null) {
  if (!v) return null;
  const s = String(v);
  return s.startsWith("--") ? `var(${s})` : s;
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

  angle = 135,
  stop1 = 0,
  stop2 = 42,
  stop3 = 110,

  interactive = false,
  hover = "none",
  hoverScale,
  hoverLift,
  hoverSaturate,
  hoverBrightness,
  hoverGlow,
  glowA = "--accent",
  glowB = "--accent-2",
  hoverText = "--accent-ink",
  hoverBorder = "--accent-2",

  ...rest
}: GlassCardSurfaceProps) {
  const vd = variantDefaults(variant);
  const finalGloss = gloss ?? vd.gloss;
  const finalGrain = grain ?? vd.grain;
  const finalMinHeight = minHeight ?? vd.minHeight;

  const cornerValue = asVarOrColor(corner);
  const cornerIsVar = Boolean(corner && String(corner).startsWith("--"));

  const cornerAccent = cornerValue ?? "rgba(0,0,0,0)";
  const cornerSoft = corner
    ? cornerIsVar
      ? cornerSoftFallback
      : cornerAccent /* literal color -> keep simple, no color-mix */
    : "rgba(0,0,0,0)";

  const bgCorner = cornerMode === "soft" ? cornerSoft : cornerAccent;

  const background =
    paper === "evening"
      ? `linear-gradient(${angle}deg,
          var(--evening-card-paper-strong) ${stop1}%,
          var(--evening-card-paper) ${stop2}%,
          ${bgCorner} ${stop3}%)`
      : `linear-gradient(${angle}deg,
          rgba(255,255,255,0.10) ${stop1}%,
          rgba(255,255,255,0.06) ${stop2}%,
          ${bgCorner} ${stop3}%)`;

  // hover defaults
  const presetGlow = hover === "glow";
  const finalHoverGlow = hoverGlow ?? presetGlow;

  const vars: CSSProperties = {
    ...(style ?? {}),
    background,
    minHeight: finalMinHeight,

    // hover vars (only used if interactive=true)
    ["--gc-hover-scale" as any]: String(hoverScale ?? (hover === "lift" || hover === "glow" ? 1.045 : 1)),
    ["--gc-hover-lift" as any]: `${hoverLift ?? (hover === "lift" || hover === "glow" ? 2 : 0)}px`,
    ["--gc-hover-saturate" as any]: String(hoverSaturate ?? (hover === "glow" ? 1.12 : 1)),
    ["--gc-hover-brightness" as any]: String(hoverBrightness ?? (hover === "glow" ? 1.04 : 1)),

    ["--gc-glow-a" as any]: asVarOrColor(glowA) ?? "var(--accent)",
    ["--gc-glow-b" as any]: asVarOrColor(glowB) ?? "var(--accent-2)",

    ["--gc-hover-text" as any]: asVarOrColor(hoverText) ?? "var(--accent-ink)",
    ["--gc-hover-border" as any]: asVarOrColor(hoverBorder) ?? "var(--accent-2)",

    ["--gc-hover-glow-on" as any]: finalHoverGlow ? "1" : "0",
  };

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
      style={vars}
      data-paper={paper}
      data-variant={variant}
      data-corner-mode={cornerMode}
      data-interactive={interactive ? "true" : "false"}
      {...rest}
    >
      {children}
    </div>
  );
}
