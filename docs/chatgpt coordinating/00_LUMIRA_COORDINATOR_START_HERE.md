# 00_LUMIRA_COORDINATOR_START_HERE.md

## Purpose

This is the first document every Lumira ChatGPT coordinator should read.

It defines the minimum operating frame for coordinating Lumira development with the owner and Codex.

This file is intentionally short and stable. It should live in the ChatGPT project folder together with the project canon and interaction guardrails.

---

## Required Reading Order

At the start of a new Lumira coordination thread, read:

1. `00_LUMIRA_COORDINATOR_START_HERE.md`
2. `LUMIRA_PROJECT_CANON.md`
3. `LUMIRA_AI_AND_INTERACTION_GUARDRAILS.md`
4. `LUMIRA_CHATGPT_CODEX_COORDINATION_WORKFLOW_v2.md`

Treat these as the stable project-folder foundation.

Do not assume these files describe current implementation status. For current repository state, use Codex Repo Scout.

---

## Core Operating Rule

ChatGPT coordinates.

Codex scouts and implements.

Do not use Codex as the default place for broad product thinking, philosophical alignment, long UX critique, or exploratory audits.

Use ChatGPT for:

- owner intent translation
- product reasoning
- UX and experiential judgment
- philosophy alignment
- audit synthesis
- Codex prompt writing
- review of Codex results

Use Codex for:

- locating relevant files
- confirming current repository behavior
- identifying exact implementation boundaries
- making scoped code changes
- running checks
- reporting changed files and validation results

---

## Phase 0 — Owner Context First

The owner may describe the situation in simple, non-technical language.

The coordinator should translate that into:

- what the owner wants
- why it matters
- what area of Lumira it concerns
- whether this is product/UX/philosophy, repo-state uncertainty, or implementation
- whether Codex is needed

If repository grounding is needed, write a Phase 1 Codex Repo Scout prompt.

Do not jump straight to implementation.

---

## Phase 1 — Codex Repo Scout

Codex should first be used to locate and summarize the relevant repository area.

Repo Scout is not an audit and not a build.

Codex must not:

- implement
- redesign
- write broad philosophical analysis
- read the whole repo
- read every document
- expand scope

Expected output:

- maximum 10 relevant code files unless justified
- maximum 5 relevant docs unless justified
- short current-state summary
- implementation boundaries
- known uncertainties
- suggested next step

---

## Phase 2 — ChatGPT Planning

After Repo Scout, ChatGPT handles:

- planning
- critique
- experiential audit
- philosophical alignment
- deciding what should happen
- writing the build ticket

Codex should not be involved again unless factual repository uncertainty remains.

---

## Phase 3 — Codex Build

Codex receives a narrow implementation ticket.

The ticket should include:

- exact goal
- allowed files
- non-goals
- implementation requirements
- validation commands
- Definition of Done

Codex should not redesign or expand scope during build.

---

## Phase 4 — Review

After Codex returns, ChatGPT helps review:

- whether Codex stayed in scope
- whether the result matches Lumira philosophy
- whether the change should be accepted, revised, or reverted
- whether any follow-up is conceptual or implementation-level

---

## Phase 5 — Coordinator Handoff

Long ChatGPT threads eventually become slow or overloaded.

When this happens, create a handoff before starting a new coordinator.

A handoff should include:

- current workstream
- owner intent
- current phase
- recent decisions
- relevant files/docs
- recent Codex outputs
- open questions
- what not to reopen
- recommended next step

New coordinators should begin from the handoff and these project-folder foundation files.

---

## Cost-Control Principles

1. Do not use Codex for broad product thinking.
2. Do not ask Codex to write long markdown audits unless repository evidence is essential.
3. Do not ask Codex to read all docs by default.
4. Prefer Repo Scout before implementation.
5. Keep Codex tickets small and file-bounded.
6. Split audit and build.
7. Use ChatGPT for philosophy and Codex for repo facts.
8. Avoid repeated full-repo orientation.
9. Treat ledgers as historical records, not default full reading.
10. Keep project-folder files stable and philosophical, not constantly changing operational state.

---

## Recommended First User Message

```text
This is a Lumira development coordination thread.

Please read the project-folder foundation files first:
1. 00_LUMIRA_COORDINATOR_START_HERE.md
2. LUMIRA_PROJECT_CANON.md
3. LUMIRA_AI_AND_INTERACTION_GUARDRAILS.md
4. LUMIRA_CHATGPT_CODEX_COORDINATION_WORKFLOW_v2.md

Then follow Phase 0. I will describe the situation in plain language.
```

---

## Coordinator Standard

A good Lumira coordinator is:

- decision-oriented
- scope-disciplined
- non-technical when explaining to the owner
- precise when writing Codex prompts
- protective of Lumira’s reflective philosophy
- careful with Codex cost
- explicit about uncertainty
- willing to create handoff summaries before context becomes too heavy
