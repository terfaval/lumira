import { supabase } from "./supabase/client";
import { isDirectionCardContent, type WorkBlock } from "./types";

export type Feldolgozottsag = "vazlat" | "erintett" | "feldolgozott";
export type RangeOption = "all" | "7" | "30" | "90" | "365";
export type SortOption = "date_desc" | "date_asc" | "score_desc" | "score_asc";

export type ArchiveSessionSummary = {
  id: string;
  title: string;
  created_at: string;
  status: string;

  // snippethez
  raw_dream_text?: string | null;

  touched_directions: string[];
  touched_directions_count: number;
  answered_cards_count: number;
  feldolgozottsag: Feldolgozottsag;
  score: number;
};

const rangeToDays: Record<Exclude<RangeOption, "all">, number> = {
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
};

function classifyFeldolgozottsag(touched: number, answered: number): Feldolgozottsag {
  if (touched === 0) return "vazlat";
  if (touched >= 3 && answered >= 1) return "feldolgozott";
  return "erintett";
}

function normalizeAnswer(answer: unknown): string {
  if (typeof answer !== "string") return "";
  return answer.trim();
}

function sanitizeTitle(t: string): string | null {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length > 72) return cleaned.slice(0, 69).trimEnd() + "…";
  return cleaned;
}

function isGenericTitle(t: string | null | undefined): boolean {
  const cleaned = (t ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return !cleaned || cleaned === "álom";
}

function extractAuditTitle(audit: unknown): string | null {
  if (!audit || typeof audit !== "object") return null;

  const maybeAudit = audit as { title?: unknown };
  const rawTitle = maybeAudit.title;

  if (typeof rawTitle === "string") {
    const cleaned = sanitizeTitle(rawTitle);
    if (!cleaned) return null;
    if (cleaned.toLowerCase() === "álom") return null;
    return cleaned;
  }

  if (rawTitle && typeof rawTitle === "object" && "toString" in rawTitle) {
    const converted = sanitizeTitle(String(rawTitle));
    if (!converted) return null;
    if (converted.toLowerCase() === "álom") return null;
    return converted;
  }

  return null;
}

/**
 * ✅ Új: preferált title forrás:
 * 1) dream_session_summaries.title
 * 2) dream_sessions.ai_framing_audit.title (régi)
 * 3) "Álom"
 */
function resolveTitle(session: any): string {
  const summaryTitle = sanitizeTitle(session?.dream_session_summaries?.title ?? "");
  if (summaryTitle && !isGenericTitle(summaryTitle)) return summaryTitle;

  const auditTitle = extractAuditTitle(session?.ai_framing_audit);
  if (auditTitle && !isGenericTitle(auditTitle)) return auditTitle;

  return "Álom";
}

export async function fetchArchiveSessions(userId: string, range?: RangeOption) {
  const days = range && range !== "all" ? rangeToDays[range] : undefined;
  const sinceDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  let sessionQuery = supabase
    .from("dream_sessions")
    .select(
      `
        id,
        status,
        created_at,
        raw_dream_text,
        ai_framing_audit,
        dream_session_summaries: dream_session_summaries (
          title
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (sinceDate) {
    sessionQuery = sessionQuery.gte("created_at", sinceDate.toISOString());
  }

  const { data: sessions, error: sessionsError } = await sessionQuery;
  if (sessionsError) throw sessionsError;

  const sessionIds = (sessions ?? []).map((s: any) => s.id);
  let workBlocks: Pick<WorkBlock, "session_id" | "content">[] = [];

  if (sessionIds.length > 0) {
    const { data: blocks, error: wbError } = await supabase
      .from("work_blocks")
      .select("session_id, content")
      .eq("block_type", "dream_analysis")
      .in("session_id", sessionIds)
      .eq("user_id", userId);

    if (wbError) throw wbError;
    workBlocks = (blocks ?? []) as Pick<WorkBlock, "session_id" | "content">[];
  }

  const aggregates = new Map<string, { touchedSlugs: Set<string>; answeredCount: number }>();

  for (const block of workBlocks) {
    if (!isDirectionCardContent(block.content)) continue;

    const touched = aggregates.get(block.session_id) ?? {
      touchedSlugs: new Set<string>(),
      answeredCount: 0,
    };

    touched.touchedSlugs.add(block.content.direction_slug);

    const answer = normalizeAnswer(block.content.user?.answer);
    if (answer.length > 0) {
      touched.answeredCount += 1;
    }

    aggregates.set(block.session_id, touched);
  }

  const summaries: ArchiveSessionSummary[] = (sessions ?? []).map((session: any) => {
    const aggregate = aggregates.get(session.id) ?? {
      touchedSlugs: new Set<string>(),
      answeredCount: 0,
    };

    const touched_directions = Array.from(aggregate.touchedSlugs);
    const touched_directions_count = touched_directions.length;
    const answered_cards_count = aggregate.answeredCount;
    const feldolgozottsag = classifyFeldolgozottsag(touched_directions_count, answered_cards_count);
    const score = touched_directions_count * 10 + answered_cards_count;

    return {
      id: session.id,
      title: resolveTitle(session),
      created_at: session.created_at,
      status: session.status,
      raw_dream_text: session.raw_dream_text ?? null,
      touched_directions,
      touched_directions_count,
      answered_cards_count,
      feldolgozottsag,
      score,
    };
  });

  const availableDirections = Array.from(new Set(summaries.flatMap((s) => s.touched_directions))).sort();

  return { summaries, availableDirections };
}
