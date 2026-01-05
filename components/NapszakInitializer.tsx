"use client";

import { useEffect } from "react";

type Napszak = "default" | "morning" | "day" | "evening" | "night";

/**
 * Ideiglenes kapcsoló:
 * - true  => mindig "default" téma
 * - false => napszak szerinti automata téma
 */
const FORCE_DEFAULT_THEME = false;

function resolveNapszak(date: Date): Exclude<Napszak, "default"> {
  const hour = date.getHours();

  if (hour >= 8 && hour < 10) return "morning";
  if (hour >= 10 && hour < 18) return "day";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function NapszakInitializer({ space }: { space?: "dream" | "evening" }) {
  useEffect(() => {
    const current: Napszak = FORCE_DEFAULT_THEME ? "default" : resolveNapszak(new Date());

    document.body.dataset.napszak = current;
    document.body.dataset.space = space ?? "dream";
  }, [space]);

  return null;
}
