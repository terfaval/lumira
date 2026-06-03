# LUMIRA_CHATGPT_CODEX_COORDINATION_WORKFLOW.md

## Purpose

This document defines the recommended development coordination workflow for Lumira when using ChatGPT coordinators and Codex coding agents.

The goal is to preserve Lumira's conceptual integrity while reducing unnecessary Codex usage.

Lumira is conceptually complex. Documentation, audits, philosophy notes, and product decisions are not optional overhead; they are part of what keeps the project coherent. The optimization target is not “less documentation.” The target is:

- less unnecessary Codex reasoning
- less repeated repository orientation
- cleaner handoffs between ChatGPT coordinators
- clearer separation between thinking, scouting, and implementation

---

## Role Separation

### ChatGPT Coordinator

Use ChatGPT for:

- understanding the owner’s plain-language intent
- product and UX reasoning
- experiential audits
- philosophical alignment
- documentation synthesis
- deciding what Codex should and should not do
- writing focused Codex prompts
- reviewing Codex outputs

### Codex

Use Codex for:

- repository-grounded scouting
- locating files and implementation boundaries
- verifying current behavior
- implementing scoped tickets
- running tests/builds/lints/typechecks
- reporting exact files changed

Codex should not be the default place for broad product thinking, long experiential audits, or open-ended design exploration.

---

## Phase 0 — Owner Context Intake

This phase happens before Codex.

The owner explains the issue in simple language.

The coordinator should not demand technical precision from the owner. Instead, the coordinator should translate the owner’s intent into structured development context.

### Phase 0 Inputs

The owner may provide:

- what feels wrong
- what should feel different
- what area of Lumira is involved
- screenshots, examples, or descriptions
- uncertainty about whether the issue is product, UX, architecture, or code

### Phase 0 Output

The coordinator produces:

1. Problem statement
2. Likely area of the system
3. Whether Codex is needed now
4. If Codex is needed, a Phase 1 Repo Scout prompt
5. If Codex is not needed, a ChatGPT planning/audit path

### Phase 0 Rule

Do not send broad, philosophical, or exploratory tasks directly to Codex.

If the task is about “what should this feel like,” “does this align,” “what is the right direction,” or “how should we think about this,” start with ChatGPT.

---

## Phase 1 — Codex Repo Scout

Codex is used as a repository navigator, not as an auditor or implementer.

### Goal

Find the relevant files and summarize the current implementation enough for ChatGPT and the owner to reason about next steps.

### Repo Scout Prompt Template

```text
# TICKET — REPO SCOUT — [Area / Topic]

## Purpose

Locate the current implementation and documentation context for:

[plain-language goal]

This is a REPO SCOUT task only.

Do not implement.
Do not modify files.
Do not write a product audit.
Do not redesign.
Do not expand scope.

## Scope

Find:

1. The primary files that define the current behavior.
2. The secondary files that may be affected.
3. The documentation files that are directly relevant.
4. Any recent ledger entries that are directly relevant.

Hard limits:

- Maximum 10 code files unless there is a strong reason.
- Maximum 5 documentation files unless there is a strong reason.
- Do not read the entire ledger.
- Do not read every document.
- Prefer current/recent context over historical context.

## Output

Return:

1. Short current-state summary.
2. Relevant files with one-line reason for each.
3. Relevant docs with one-line reason for each.
4. Implementation boundaries.
5. Known uncertainties.
6. Suggested next step.

No code changes.
```

---

## Phase 2 — ChatGPT Planning / Audit / Decision

## Owner Decision Protocol

Lumira's owner is the primary authority on product direction, philosophy, experience design, and strategic priorities.

The owner is not expected to understand repository architecture, implementation details, runtime contracts, documentation topology, or engineering terminology.

The coordinator is responsible for translating technical and architectural questions into owner-decision questions.

### Translation Rule

Whenever a decision requires owner approval, the coordinator must not present raw technical options.

Instead, the coordinator must translate the situation into plain language.

The owner should be able to understand:

1. What decision is being made.
2. Why the decision matters.
3. What options exist.
4. The advantages and disadvantages of each option.
5. The coordinator's recommendation.

### Required Decision Format

When owner input is required, the coordinator should provide:

#### What is the question?

A short plain-language explanation.

#### Why does it matter?

Explain the impact on the project in non-technical terms.

#### Options

Present between 2 and 4 options.

Avoid excessive implementation detail.

#### Pros and Cons

Use owner-facing language.

Do not assume technical knowledge.

#### Recommendation

The coordinator should recommend a preferred option and explain why.

### Technical Translation Principle

The coordinator should never assume that the owner understands:

* repository architecture
* runtime contracts
* state-layer terminology
* implementation patterns
* engineering tradeoffs

The coordinator must translate these concepts into product, user experience, maintenance, risk, and project-management language.

### Decision Necessity Rule

Not every question requires owner involvement.

The coordinator should decide whether the issue is:

- implementation detail
- local design decision
- architectural tradeoff
- owner-level product decision

Only escalate questions that materially affect:

- product direction
- philosophy
- user experience
- long-term maintenance
- repository governance

### Approval Rule

If an owner decision is required, the coordinator should obtain the decision before creating a BUILD ticket.

Do not bypass owner approval by framing strategic choices as implementation details.

### Success Criterion

A successful coordination process allows the owner to make informed decisions without needing to become a software engineer.

After Repo Scout, ChatGPT does the expensive thinking work outside Codex.

This includes:

- experiential audits
- product decisions
- UX critique
- philosophy alignment
- tradeoff analysis
- implementation strategy
- ticket preparation

### Why this matters

Codex is expensive when asked to combine:

- repository reading
- documentation reading
- product interpretation
- UX critique
- long-form markdown writing
- implementation planning

The coordinator should isolate those functions.

---

## Phase 3 — Codex Build

Codex receives a narrow implementation ticket.

### Build Ticket Template

```text
# TICKET — BUILD — [Name]

## Purpose

Implement the approved change:

[one-paragraph summary]

## Approved Direction

[decision already made in ChatGPT]

## Allowed Files

You may modify only:

- [file]
- [file]

If another file appears necessary, stop and explain why before changing it.

## Non-goals

Do not:

- redesign architecture
- introduce new features
- introduce new dependencies
- change runtime contracts unless explicitly listed
- refactor unrelated code
- rewrite copy outside the specified area
- perform broad cleanup

## Implementation Requirements

- [specific requirement]
- [specific requirement]
- [specific requirement]

## Validation

Run only the relevant checks unless the ticket explicitly requires full validation:

- [test/typecheck/lint/build]

## Definition of Done

- [observable result]
- [observable result]
- [validation result]

## Return

Return:

1. Summary
2. Files changed
3. Tests/checks run
4. Anything not completed
5. Any uncertainty or follow-up needed
```

---

## Phase 4 — Review

After Codex finishes, ChatGPT helps review.

The review should answer:

- Did Codex stay in scope?
- Did it change only the intended files?
- Did it preserve Lumira’s product philosophy?
- Are there screenshots or runtime observations that need human review?
- Should the result be accepted, revised, or reverted?

Do not automatically start a new Codex task after every Codex response. First decide whether the issue is conceptual, visual, or code-level.

---

## Phase 5 — Coordinator Handoff / Reincarnation

Long ChatGPT coordination threads can become slow, overloaded, or hard to navigate.

This is expected. Do not wait until the thread becomes unusable.

### When to reincarnate a coordinator

Start a new coordinator when:

- responses become noticeably slower
- the thread contains many unrelated phases
- the current topic has shifted to a new subsystem
- the coordinator starts losing precision
- too much context is being carried implicitly
- a major sprint boundary has been reached

### Reincarnation Rule

Before moving to a new coordinator, create a handoff note.

The handoff note becomes the new coordinator’s starting context.

### Handoff Note Template

```markdown
# Lumira Coordinator Handoff — [Date / Topic]

## Current Workstream

[What we are currently working on.]

## Owner Intent

[Plain-language description of what the owner wants.]

## Current Phase

- Phase 0 / 1 / 2 / 3 / 4 / 5
- Current status:

## Recent Decisions

1. [Decision]
2. [Decision]
3. [Decision]

## Relevant Repository Areas

Code files:
- [file] — [why relevant]

Documentation:
- [doc] — [why relevant]

## Recent Codex Outputs

- [summary of scout/build/audit output]
- [important constraints or findings]

## Open Questions

1. [question]
2. [question]

## Do Not Reopen Unless Asked

- [settled decision]
- [rejected option]
- [out-of-scope area]

## Recommended Next Step

[Exactly what the next coordinator should do first.]
```

### New Coordinator Startup Message

```text
This is a reincarnated Lumira coordination thread.

Please read:
1. 00_COORDINATOR_START_HERE.md
2. LUMIRA_CHATGPT_CODEX_COORDINATION_WORKFLOW.md
3. The handoff note below

Then continue from the recommended next step. Do not reopen settled decisions unless I explicitly ask.
```

---

## Documentation Strategy

Lumira needs documentation because the product direction is subtle and easy to distort.

The goal is not to remove documentation. The goal is to make documentation navigable.

### Current Principle

Documentation should be divided into layers:

1. Start Here / Coordinator Protocol
2. Current State
3. Active Specs
4. Runtime Contracts
5. Historical Ledger
6. Audits and Plans
7. Archive

### Important Future Sprint

A repo stabilization sprint should introduce:

- `CURRENT_STATE.md`
- revised `STABILIZATION_LEDGER.md` usage rules
- documentation layer cleanup
- clearer docs index/navigation
- rules for when agents read current state vs historical records

Until then:

- Do not treat the full ledger as required reading by default.
- Use the ledger only for recent entries or specifically relevant history.
- Prefer focused documents over broad historical reconstruction.

---

## Cost-Control Rules

### Good Codex Usage

Use Codex when the question is:

- Where is this implemented?
- What files define this behavior?
- What does the current code do?
- Can you implement this precise patch?
- Can you run the relevant checks?
- Did this change touch anything unexpected?

### Bad Codex Usage

Avoid using Codex when the question is:

- Does this feel right?
- What should the experience be?
- Is this philosophically aligned?
- What is the product direction?
- Can you write a long audit?
- Can you explore everything and decide what to do?

Those belong in ChatGPT unless they require repository evidence.

---

## Practical Heuristics

1. If the output is mostly markdown thinking, start in ChatGPT.
2. If the output is a changed repository file, use Codex.
3. If the question depends on exact repo state, use Codex Repo Scout.
4. If the question depends on product judgment, use ChatGPT.
5. If Codex would need to read more than 10 files to answer, split the task.
6. If Codex would need to understand the whole product philosophy, stop and move the reasoning to ChatGPT.
7. If a ticket asks for audit + build together, split it.
8. If a ticket touches architecture, run a scout first.
9. If a ticket is visual/experiential, do the audit in ChatGPT and use Codex only for implementation.
10. If a thread becomes slow, create a handoff note and reincarnate.

---

## Minimal Weekly Operating Pattern

For each workstream:

1. Phase 0 — owner explains intent to ChatGPT.
2. Phase 1 — Codex Repo Scout if repo grounding is needed.
3. Phase 2 — ChatGPT plans/audits/decides.
4. Phase 3 — Codex implements.
5. Phase 4 — ChatGPT reviews.
6. Phase 5 — handoff if the thread is becoming overloaded.

This preserves conceptual continuity while keeping Codex focused on its highest-value role.
