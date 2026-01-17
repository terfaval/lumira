export function normalizeDirectionContent(input: unknown): { obj: any; ok: boolean } {
  if (input === null || input === undefined) return { obj: {}, ok: false };

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object") return { obj: parsed, ok: true };
      return { obj: {}, ok: false };
    } catch {
      return { obj: {}, ok: false };
    }
  }

  if (typeof input === "object") return { obj: input, ok: true };

  return { obj: {}, ok: false };
}
