// src/domain/background/localBackgroundMap.ts
export type Napszak = "morning" | "noon" | "afternoon" | "evening" | "night" | "day" | "default";

export function localBackgroundFor(napszak?: string): string {
  const n = (napszak ?? "default") as Napszak;

  // állítsd be úgy, ahogy a public/ alatt elnevezed
  switch (n) {
    case "morning": return "/background/morning.png";
    case "noon": return "/background/noon.png";
    case "afternoon": return "/background/afternoon.png";
    case "evening": return "/background/evening.png";
    case "night": return "/background/night.png";
    case "day": return "/background/noon.png";
    case "default":
    default: return "/background/evening.png";
  }
}
