// src/lib/dream/workLedger.ts

export async function fetchUsedAnchorKeysFromLedger(args: {
  supabase: any;
  sessionId: string;
  userId: string;
  directionSlug?: string;
  limit?: number;
  includeAnswered?: boolean;
}): Promise<Set<string>> {
  const used = new Set<string>();
  try {
    const includeAnswered = args.includeAnswered ?? true;
    let q = args.supabase
      .from("work_question_ledger")
      .select("anchor_keys, created_at, answered")
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 80);

    if (args.directionSlug) q = q.eq("direction_slug", args.directionSlug);
    if (!includeAnswered) q = q.eq("answered", false);

    const { data, error } = await q;
    if (error) {
      console.warn("fetch ledger failed", error.message);
      return used;
    }

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
}): Promise<{ id?: string }> {
  try {
    const { data, error } = await args.supabase
      .from("work_question_ledger")
      .insert({
        session_id: args.sessionId,
        user_id: args.userId,
        direction_slug: args.directionSlug ?? "unknown",
        question_text: args.questionText,
        question_intent: args.questionIntent ?? null,
        anchor_keys: args.anchorKeys ?? [],
      })
      .select("id")
      .single();

    if (error) {
      console.warn("insert ledger failed", error.message);
      return {};
    }

    return { id: (data as any)?.id };
  } catch (e: any) {
    console.warn("insert ledger exception", e?.message ?? e);
    return {};
  }
}

export async function markLedgerAnswered(args: {
  supabase: any;
  ledgerId: string;
  answerEventId?: string | null;
}): Promise<void> {
  try {
    const { error } = await args.supabase
      .from("work_question_ledger")
      .update({
        answered: true,
        answer_event_id: args.answerEventId ?? null,
      })
      .eq("id", args.ledgerId);

    if (error) console.warn("mark ledger answered failed", error.message);
  } catch (e: any) {
    console.warn("mark ledger answered exception", e?.message ?? e);
  }
}