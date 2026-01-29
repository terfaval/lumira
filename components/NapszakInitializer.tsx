"use client";

import { useEffect } from "react";

export type Napszak =
  | "default"
  | "dawn"
  | "morning"
  | "day"
  | "afternoon"
  | "evening"
  | "night";

/**
 * Debug / override kapcsoló
 * true  => mindig "default"
 * false => automatikus napszak
 */
const FORCE_DEFAULT_THEME = false;

function resolveNapszak(date: Date): Exclude<Napszak, "default"> {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 10) return "morning";
  if (hour >= 10 && hour < 15) return "day";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function NapszakInitializer() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const napszak: Napszak =
      FORCE_DEFAULT_THEME ? "default" : resolveNapszak(new Date());

    document.body.dataset.napszak = napszak;
  }, []);

  return null;
}
