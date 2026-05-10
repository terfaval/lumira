# MIRA / Lumira

Lumira is a guided dream journaling and reflection app.

It helps users capture dreams, revisit them over time, and explore them through calm, guided reflection flows.

## Current Stage

Lumira is currently in stabilization before public alpha.

The core experience is functional, but parts of the internal architecture are still being simplified and consolidated.

Current priority:
- stabilize the core session flow
- reduce legacy complexity
- clarify canonical data ownership
- prepare the system for early external testers

## Product Principles

- Non-diagnostic
- Non-interpretive
- User-led reflection

## What Lumira Does

1. Capture dreams in session form
2. Generate a reflective frame
3. Offer optional reflection directions
4. Continue through question-based work cards
5. Allow revisiting sessions over time

## Safety & Design Principles

Lumira is intentionally non-diagnostic and non-authoritative.

The system does not attempt to provide final dream interpretations or psychological conclusions.

The AI acts as a reflective companion: it asks questions, helps maintain focus, and supports user-led meaning making.

## Core Flow

`session -> observe -> frame -> direction -> work`

## Architecture Direction

Lumira uses a versioned, traceable pipeline model with a stable core flow and asynchronous support flows. Current architecture work focuses on core-flow reliability, canonical data ownership, and isolating legacy paths without broad refactors.

## Tech Stack

- Next.js `16.1.1` (App Router)
- React `19.2.3`
- TypeScript
- Supabase
- OpenAI SDK (`openai`)
- Vitest

## Local Setup

Requirements:
- Node.js 20+
- npm

Install:

```bash
npm install
```

Environment:
- Fill `.env.local` with required keys (Supabase, OpenAI, and app-specific values).
- Do not commit secrets.

Run:

```bash
npm run dev
```

## Build / Test / Validate

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

## Agent-First Development

This repo uses an agent-first workflow. Start with:
- `AGENTS.md`
- `docs/AGENT_START_HERE.md`
- `docs/STABILIZATION_LEDGER.md`

## Documentation Map

- `docs/AGENT_START_HERE.md`
- `docs/STABILIZATION_LEDGER.md`
- `docs/DECISIONS.md`
- `docs/SPEC_INDEX.md`
- `ROUTE_MAP.md`
