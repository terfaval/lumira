// src/lib/dream/workLedger.ts

export async function fetchUsedAnchorKeysFromLedger(args: {
  supabase: any;
  sessionId: string;
  userId: string;
  directionSlug?: string;
  limit?: number;
}): Promise<Set<string>> {
  const used = new Set<string>();
  try {
    let q = args.supabase
      .from("work_question_ledger")
      .select("anchor_keys, created_at")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 80);

    if (args.directionSlug) q = q.eq("direction_slug", args.directionSlug);

    const { data, error } = await q;
    if (error) return used;

    for (const row of data ?? []) {
      const keys = (row as any)?.anchor_keys;
      if (!Array.isArray(keys)) continue;
      for (const k of keys) if (typeof k === "string" && k.trim()) used.add(k.trim());
    }
  } catch {}
  return used;
}

export async function insertLedgerQuestion(args: {
  supabase: any;
  sessionId: string;
  userId: string;
  directionSlug?: string;
  questionText: string;
  questionIntent?: string | null;
  anchorKeys: string[];
}) {
  try {
    await args.supabase.from("work_question_ledger").insert({
      session_id: args.sessionId,
      user_id: args.userId,
      direction_slug: args.directionSlug ?? "unknown",
      question_text: args.questionText,
      question_intent: args.questionIntent ?? null,
      anchor_keys: args.anchorKeys ?? [],
    });
  } catch {}
}
