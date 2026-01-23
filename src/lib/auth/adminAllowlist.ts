// src/lib/auth/adminAllowlist.ts
export const GLOSSARY_ADMIN_IDS = new Set([
  "ebb541e7-44c1-4eab-b3ed-986a63f14dd0",
]);

export function isGlossaryAdmin(userId: string) {
  return GLOSSARY_ADMIN_IDS.has(userId);
}
