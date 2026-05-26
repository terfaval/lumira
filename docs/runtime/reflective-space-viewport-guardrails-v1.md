# Reflective Space Viewport Guardrails v1

## Status

Runtime guardrail note for `/api/reflective-space/viewport`.

## Purpose

Protect the entry viewport from:
- unbounded aggregation
- feed-like expansion
- payload bloat
- hidden engagement drift

## Guardrail Contracts

- Section caps are explicit and bounded:
  - reflective objects
  - observations
  - thread surfaces
  - response surfaces
  - glossary continuity
  - opening surfaces
  - dialogue traces
- Every section exposes bounded window metadata:
  - `limit`
  - `returned`
  - `hasMore`
  - cursor fields
  - omission reason
- Payload size is measured and trimmed calmly if needed.

## Cursor Contract

Dialogue windows support stable cursor semantics:
- `(created_at, id)`
- encoded as `created_at|id`

Timestamp-only cursor support remains for backward compatibility.

## Archived/Historical Behavior

Historical dialogue traces should remain intelligible.

- Archived source openings/responses may still appear in dialogue trace composition.
- Archived entities are not surfaced as active opening prompts.
- Historical visibility does not imply active resurfacing.

## Read-only Rule

Viewport composition is read-only.

Disallowed in viewport composition:
- mutation side effects
- latent generation
- opening generation
- engagement ranking
- recommendation synthesis

## Silence Rule

Silence is a valid viewport outcome.

Empty sections are normal and should not be framed as failure or missing progress.
