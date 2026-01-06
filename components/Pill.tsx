"use client";

import React from "react";

type PillProps = {
  children: React.ReactNode;
  /** pl. "--intent-biztonsag" vagy "--phase-prep" */
  colorVar?: `--${string}`;
  /** neutral = tag / szürke */
  variant?: "intent" | "phase" | "neutral";
  className?: string;
};

export function Pill({ children, colorVar, variant = "neutral", className }: PillProps) {
  const style: React.CSSProperties | undefined = colorVar
    ? { color: `var(${colorVar})`, borderColor: `var(${colorVar})` }
    : undefined;

  return (
    <span className={`pill pill--${variant}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </span>
  );
}
