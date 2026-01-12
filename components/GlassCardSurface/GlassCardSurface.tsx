"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./GlassCardSurface.module.css";

type CornerVar = `--${string}` | string;

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;

  /**
   * Sarok “accent” szín.
   * - Add át CSS var-ként: "--intent-xxx-bg" / "--accent" stb.
   * - vagy konkrét színként: "rgba(...)" / "#RRGGBB" (ritkábban)
   */
  corner?: CornerVar | null;

  /**
   * “Papír” háttér preset:
   * - "evening" a mostani EveningCardFlip alap
   * - "plain" csak üveg (ha más felületen akarod)
   */
  paper?: "evening" | "plain";

  /**
   * Minimum magasság (pl. "60vh" mint az EveningCardFlip-ben)
   */
  minHeight?: string;
};

function cx(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(" ");
}

export function GlassCardSurface({
  children,
  className,
  style,
  corner = null,
  paper = "evening",
  minHeight = "60vh",
}: Props) {
  const bgCorner = corner ? (corner.startsWith("--") ? `var(${corner})` : corner) : "rgba(0,0,0,0)";

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
      className={cx(styles.surface, className)}
      style={{
        ...style,
        background,
        minHeight,
      }}
    >
      {children}
    </div>
  );
}
