"use client";

import { useEffect } from "react";

function resolveNapszak(date: Date) {
  const hour = date.getHours();
  if (hour >= 6 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "dusk";
  return "night";
}

export function NapszakInitializer({ space }: { space?: "dream" | "evening" }) {
  useEffect(() => {
    // Applies the day/dusk/night tokens + space (álomtér vs esti tér) to the body element.
    const current = resolveNapszak(new Date());
    document.body.dataset.napszak = current;
    document.body.dataset.space = space ?? "dream";
  }, [space]);

  return null;
}