"use client";

import type React from "react";

export function PrimaryButton({ variant = "primary", className = "", ...props }: PrimaryButtonProps) {
  const palette = variant === "primary" ? "btn-primary" : "btn-secondary";
  return <button {...props} className={["btn", palette, className].filter(Boolean).join(" ")} />;
}

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};