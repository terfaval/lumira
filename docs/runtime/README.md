# Runtime Target Docs

`docs/runtime/` contains target clean-room runtime architecture and runtime object relationships.

Use this folder for:

- target cognition runtime boundaries
- lifecycle/state contracts
- canonical runtime data models
- target schema direction
- governance primitives and runtime safety contracts (e.g. latent weighting/silence rules)

Important:

- Some runtime docs still include transition notes for historical continuity.
- Transition/bridge instructions are not canonical product truth; if conflict exists, clean-room runtime intent wins.
- Legacy route/API ownership and rollout sequencing live in `docs/archive/legacy-transition/`.

Latest latent runtime additions:
- `docs/runtime/latent-governance-primitives-v1.md`
- `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
- `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`

Latest latent governance update:
- Internal transport projection boundary is now enforced for latent snapshot APIs (Patch 6, 2026-05-31 UTC).
- No-mode semantics now enforce true mode silence with exploratory/no-mode separation under ambiguity pressure (Patch 7, 2026-05-31 UTC).
