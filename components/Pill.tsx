"use client";

import React from "react";

type PillProps = {
  children: React.ReactNode;
  /** pl. "--intent-biztonsag" vagy "--phase-prep" */
  colorVar?: `--${string}`;
  /** pl. "--intent-biztonsag-bg" */
  bgVar?: `--${string}`;
  /** neutral = tag / szürke */
  variant?: "intent" | "phase" | "neutral";
  className?: string;
};

export function Pill({ children, colorVar, bgVar, variant = "neutral", className }: PillProps) {
  const style: React.CSSProperties | undefined =
    colorVar || bgVar
      ? {
          color: colorVar ? `var(${colorVar})` : undefined,
          borderColor: colorVar ? `var(${colorVar})` : undefined,
          background: bgVar ? `var(${bgVar})` : undefined,
        }
      : undefined;

  return (
    <span className={`pill pill--${variant}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </span>
  );
}
