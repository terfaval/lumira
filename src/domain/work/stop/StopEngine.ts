export type StopReasonCode = "low_novelty" | "prefs_block_all" | "safety_limit" | "model_failure";

export type StopSignal = {
  suggest_stop: true;
  reason_code: StopReasonCode;
  message: string;
  suggested_actions: Array<"switch_direction" | "continue_later" | "free_journal">;
};

export function buildStopSignal(reason_code: StopReasonCode): StopSignal {
  if (reason_code === "prefs_block_all") {
    return {
      suggest_stop: true,
      reason_code,
      message: "A beallitasaid miatt ebben az iranyban most minden kerdes tiltva van.",
      suggested_actions: ["switch_direction", "continue_later"],
    };
  }

  if (reason_code === "safety_limit") {
    return {
      suggest_stop: true,
      reason_code,
      message: "Most kimeletesebben haladunk. Ha szeretned, tartsunk szunetet vagy valtsunk iranyt.",
      suggested_actions: ["switch_direction", "continue_later"],
    };
  }

  if (reason_code === "model_failure") {
    return {
      suggest_stop: true,
      reason_code,
      message: "Most nem sikerult egy uj kerdest osszeallitani.",
      suggested_actions: ["switch_direction", "continue_later"],
    };
  }

  return {
    suggest_stop: true,
    reason_code: "low_novelty",
    message: "Ebben az iranyban most nincs uj kapaszkodo. Valtsunk iranyt vagy pihenjunk meg.",
    suggested_actions: ["switch_direction", "continue_later"],
  };
}
