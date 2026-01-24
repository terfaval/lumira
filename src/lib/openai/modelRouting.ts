import { OPENAI_MODELS } from "@/src/lib/openai/server";

export type ModelJobName = "frame" | "observe" | "compose_card" | "latent_update";
export type RetryReason = "parse_fail" | "schema_fail" | "lang_fail" | "quality_fail" | "none";

export type ModelTrace = {
  job_name: ModelJobName;
  model_used: string;
  attempt_index: number;
  retry_reason: RetryReason;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
};

export class RetryableError extends Error {
  retry_reason: RetryReason;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;

  constructor(reason: RetryReason, message?: string, usage?: { prompt_tokens?: number; completion_tokens?: number }) {
    super(message ?? reason);
    this.retry_reason = reason;
    this.prompt_tokens = usage?.prompt_tokens ?? null;
    this.completion_tokens = usage?.completion_tokens ?? null;
  }
}

export function pickModelForJob(jobName: ModelJobName, attempt: number): string {
  switch (jobName) {
    case "frame":
      return attempt === 0 ? OPENAI_MODELS.FRAME : OPENAI_MODELS.FULL_41;
    case "observe":
      if (attempt === 0) return OPENAI_MODELS.OBSERVE;
      if (attempt === 1) return OPENAI_MODELS.MINI_41;
      return OPENAI_MODELS.FULL_41;
    case "compose_card":
      if (attempt === 0) return OPENAI_MODELS.WORK;
      if (attempt === 1) return OPENAI_MODELS.MINI_41;
      return OPENAI_MODELS.FULL_41;
    case "latent_update":
      return attempt === 0 ? OPENAI_MODELS.OBSERVE : OPENAI_MODELS.MINI_41;
    default:
      return OPENAI_MODELS.OBSERVE;
  }
}

export function maxAttemptsForJob(jobName: ModelJobName): number {
  switch (jobName) {
    case "frame":
      return 2;
    case "latent_update":
      return 2;
    case "observe":
    case "compose_card":
      return 3;
    default:
      return 1;
  }
}

export function logModelTrace(info: ModelTrace) {
  try {
    console.info(JSON.stringify(info));
  } catch {
    // no-op
  }
}

export async function callWithRetries<T>(args: {
  jobName: ModelJobName;
  callFn: (ctx: {
    model: string;
    attempt: number;
    maxAttempts: number;
  }) => Promise<{ result: T; usage?: { prompt_tokens?: number; completion_tokens?: number } }>;
}): Promise<{ result: T; model_used: string; attempt_index: number }> {
  const maxAttempts = maxAttemptsForJob(args.jobName);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const model = pickModelForJob(args.jobName, attempt);
    try {
      const { result, usage } = await args.callFn({ model, attempt, maxAttempts });
      logModelTrace({
        job_name: args.jobName,
        model_used: model,
        attempt_index: attempt,
        retry_reason: "none",
        prompt_tokens: usage?.prompt_tokens ?? null,
        completion_tokens: usage?.completion_tokens ?? null,
      });
      return { result, model_used: model, attempt_index: attempt };
    } catch (err) {
      lastError = err;
      if (err instanceof RetryableError) {
        logModelTrace({
          job_name: args.jobName,
          model_used: model,
          attempt_index: attempt,
          retry_reason: err.retry_reason,
          prompt_tokens: err.prompt_tokens ?? null,
          completion_tokens: err.completion_tokens ?? null,
        });
        if (attempt < maxAttempts - 1) continue;
      }
      throw err;
    }
  }

  throw lastError;
}
