# Lumira Documentation Index

## Purpose

Use this file as the primary documentation map for the repository.

It answers:
- which documentation layer you are in
- which documents are authoritative
- what to read first for your role
- where to look next for task-specific context

## Authority Layers

### Start Here

Use for first-entry orientation and navigation.

- `AGENTS.md`
- `docs/AGENT_START_HERE.md`
- `docs/DOCS_INDEX.md`
- `docs/CURRENT_STATE.md`

### Canon

Use for product identity, reflective philosophy, interaction doctrine, and AI boundaries.

Start with:
- `docs/canon/README.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`
- `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
- `docs/canon/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/clean-room-technical-constitution.md`

### Runtime

Use for behavioral contracts, cognition/runtime rules, lifecycle/state boundaries, and runtime data models.

Start with:
- `docs/runtime/README.md`
- `docs/runtime/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/runtime/lumira-reflective-schema-target-v0.md`
- `docs/runtime/latent-governance-primitives-v1.md`
- `docs/runtime/reflective-space-viewport-guardrails-v1.md`

### Architecture

Use for technical governance, implementation boundary decisions, and repository-level design authority.

Start with:
- `docs/canon/clean-room-technical-constitution.md`
- `docs/canon/backend-v2/BACKEND_V2_CONSTRUCTION_SITE.md`
- `docs/DECISIONS.md`

### Coordinator Infrastructure

Use for ChatGPT/Codex coordination workflow, coordinator onboarding, and handoff discipline.

This is not canon and not runtime authority.

Start with:
- `docs/chatgpt coordinating/00_LUMIRA_COORDINATOR_START_HERE.md`
- `docs/chatgpt coordinating/LUMIRA_PROJECT_CANON.md`
- `docs/chatgpt coordinating/LUMIRA_AI_AND_INTERACTION_GUARDRAILS.md`
- `docs/chatgpt coordinating/LUMIRA_CHATGPT_CODEX_COORDINATION_WORKFLOW_v2.md`

### Audits

Use for evaluations, reality checks, documentation reviews, and drift detection.

Primary locations:
- `docs/superpowers/audits/`
- `docs/archive/audits/`

### Plans

Use for future implementation intent and scoped planning work.

Primary locations:
- `docs/superpowers/plans/`
- `docs/superpowers/specs/`

### Historical Archive

Use for retired assumptions, legacy transition context, and historical bridge material.

Start with:
- `docs/archive/legacy-transition/README.md`

Primary locations:
- `docs/archive/legacy-transition/`
- `docs/archive/legacy/`
- `docs/archive/audits/`
- `docs/backend-v2-migration/` (historical only; not active Backend V2 authority)

## Role-Based Onboarding

### Codex Agent

Read in this order:
1. `AGENTS.md`
2. `docs/AGENT_START_HERE.md`
3. `docs/DOCS_INDEX.md`
4. the assigned ticket
5. `docs/SPEC_INDEX.md` for task-context lookup
6. only the docs directly relevant to the ticket

### ChatGPT Coordinator

Read in this order:
1. `docs/DOCS_INDEX.md`
2. `docs/chatgpt coordinating/00_LUMIRA_COORDINATOR_START_HERE.md`
3. `docs/chatgpt coordinating/LUMIRA_PROJECT_CANON.md`
4. `docs/chatgpt coordinating/LUMIRA_AI_AND_INTERACTION_GUARDRAILS.md`
5. `docs/chatgpt coordinating/LUMIRA_CHATGPT_CODEX_COORDINATION_WORKFLOW_v2.md`

Use Codex Repo Scout for current repository reality when needed.

### Project Owner Returning After Time Away

Read in this order:
1. `docs/DOCS_INDEX.md`
2. `docs/CURRENT_STATE.md`
3. `docs/canon/LUMIRA-CONSTITUTION-v1.md`
4. `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
5. `docs/DECISIONS.md`
6. recent relevant entries in `docs/STABILIZATION_LEDGER.md`

### Contributor

Read in this order:
1. `AGENTS.md`
2. `docs/AGENT_START_HERE.md`
3. `docs/DOCS_INDEX.md`
4. `docs/SPEC_INDEX.md`
5. the ticket and directly relevant docs

## How To Use The Indexes

- `docs/DOCS_INDEX.md`: primary documentation map and authority guide
- `docs/CURRENT_STATE.md`: operational re-entry snapshot
- `docs/SPEC_INDEX.md`: task-context lookup after you already know what kind of task you are doing

Do not use `docs/SPEC_INDEX.md` as the main onboarding document.

## Ledger Role

`docs/STABILIZATION_LEDGER.md` is historical and process context.

Use it for:
- recent build history
- milestone chronology
- verification references

Do not use it as the default repository onboarding document.

## Navigation Rules

- Prefer `README.md` files when entering a documentation layer.
- Use `docs/CURRENT_STATE.md` when you need present operational reality rather than doctrine or chronology.
- Prefer `docs/canon/` over historical material when philosophy or behavior authority is needed.
- Prefer `docs/runtime/` over historical material when runtime contracts are needed.
- Use archive docs only when a ticket explicitly needs historical or transition context.
- If a task needs deeper context, use `docs/SPEC_INDEX.md` to narrow the next reads.
