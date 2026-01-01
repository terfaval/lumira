import { ReactNode } from "react";

export function Card({ children, muted = false, className = "" }: { children: ReactNode; muted?: boolean; className?: string }) {
  const tone = muted ? "card-muted" : "";
  return <div className={["card", tone, className].filter(Boolean).join(" ")}>{children}</div>;
}