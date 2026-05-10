# Decisions

This file records accepted product, architecture, and workflow decisions.

## D1 — README is public-alpha oriented

Status: Accepted
Decision:
README should explain product identity, setup, current stage, and high-level architecture.
Detailed agent workflow belongs in `AGENTS.md` and `docs/AGENT_START_HERE.md`.

## D2 — Stabilization Ledger is active development memory

Status: Accepted
Decision:
Ongoing stabilization work must be recorded in `docs/STABILIZATION_LEDGER.md`.

## D3 — Core flow is the public-alpha priority

Status: Accepted
Decision:
The public-alpha priority is:

`session -> observe -> frame -> direction -> work`

Deferred areas include legacy dreammap paths, older adapters, low-priority cleanup, and non-core experiments.

## D4 — Agents should not read everything by default

Status: Accepted
Decision:
Agents should start from `docs/AGENT_START_HERE.md`, then use `docs/SPEC_INDEX.md` to choose relevant deeper docs.

## D5 � Alpha keeps ensure-based v0 observation as runtime truth

Status: Accepted

Decision:
During public-alpha stabilization, the active core-flow observation runtime remains ensure-based and v0-centric.

`/api/session/ensure` and `jobExtractObservation` remain the current runtime truth for observation-dependent core flow behavior.

Direct `/api/observe` and `dream_v1` observation paths remain active but transitional/internal during alpha stabilization.

Long-term direction:
After alpha stabilization, the intended architecture direction is full observation convergence toward one unified `dream_v1`-based observation system.

Rationale:
The current user-facing core flow is ensure-based, and downstream orchestration currently depends on v0 observation reads. Moving the core flow to `dream_v1` before alpha would increase migration risk and could destabilize observe/frame/direction/work behavior.

This decision separates:
- short-term runtime stabilization
from
- long-term architecture destination.
