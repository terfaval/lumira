# Decisions

This file records accepted product, architecture, and workflow decisions for the clean-room rebuild era.

Last updated: 2026-05-24

## D1 - Clean-room reboot is active

Status: Accepted
Decision:
Lumira is being rebuilt from clean-room foundations. Legacy runtime implementation details are not a default input for new build work.

## D2 - Documentation authority model

Status: Accepted
Decision:
- `docs/canon/` is the primary product and behavior authority.
- `docs/runtime/` defines target runtime architecture and contracts.
- `docs/archive/legacy-transition/` is historical reference only.

## D3 - Legacy compatibility is non-authoritative

Status: Accepted
Decision:
Compatibility bridges, projection contracts, rollout plans, parity gates, and route/API migration plans are historical transition material and are not canonical truth.

## D4 - No legacy carry-over by default

Status: Accepted
Decision:
New implementation work must not reintroduce legacy route/workflow assumptions unless explicitly requested by the owner for a specific migration or recovery task.

## D5 - Minimal repository baseline during reset

Status: Accepted
Decision:
During reset, only foundational project/config files and clean-room docs are kept as active context. Runtime code, assets, legacy scripts, and old data/schema trees are removed before new scaffolding.
