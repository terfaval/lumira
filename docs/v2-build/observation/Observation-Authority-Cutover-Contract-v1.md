# Observation Authority Cutover Contract v1

Date: 2026-06-09
Status: Active
Purpose: Establish the authoritative definition of Observation during the Backend V2 transition

---

# 1. Purpose

This document defines Observation authority within Backend V2.

It answers a single question:

> What officially defines Observation?

This document does not define:

* Observation philosophy
* Observation bundle contents
* persistence schemas
* implementation details
* migration mechanics

Those responsibilities belong elsewhere.

This document defines authority.

---

# 2. Authority Principle

The canonical definition of Observation is:

```text
Observation Bundle Contract
```

The Observation Bundle Contract is the authoritative source for:

* Observation structure
* Observation boundaries
* Observation content
* Observation ownership
* Observation memory responsibilities

If another system disagrees with the Observation Bundle Contract, the Observation Bundle Contract wins.

---

# 3. Observation Source Of Truth

The source of truth for Observation is:

```text
Dream
↓
Scenes
↓
Observations
↓
Derived Structures
```

Observation is therefore:

* scene-first
* observation-centered
* evidence-linked
* uncertainty-aware
* non-interpretive

No alternative Observation definition should supersede this structure.

---

# 4. Non-Authoritative Structures

The following structures may continue to exist during migration.

They are not authoritative definitions of Observation.

## V1 Fragment Arrays

Examples:

```text
summary
fragments[]
```

or

```text
Observation
↓
Fragment[]
```

These may continue to exist as compatibility artifacts.

They do not define Observation.

---

## Compatibility Projections

Any V2 → V1 projection layer exists solely to support migration.

Projection outputs are not Observation truth.

They are compatibility views.

---

## Persistence Shapes

Database rows do not define Observation.

Persistence exists to store Observation.

Persistence does not define Observation.

If persistence and the Observation Bundle Contract diverge, persistence should eventually be brought back into alignment.

---

## APIs

API payloads do not define Observation.

APIs expose Observation.

They do not determine its canonical structure.

---

## UI Models

UI surfaces may display Observation in different ways.

These displays are read models.

They are not the Observation definition.

---

## Downstream Layers

The following layers consume Observation:

* Glossary
* Latent
* Openings
* Reflections
* Dream Map

None of these layers may redefine Observation.

They depend upon Observation.

Observation does not depend upon them for its definition.

---

# 5. Ownership Principle

Observation owns Observation.

Downstream layers may:

* consume Observation
* derive from Observation
* organize around Observation

They may not redefine Observation.

This applies equally to:

* repositories
* services
* APIs
* UI layers
* cognition layers

Observation authority flows outward.

It does not flow inward from consumers.

---

# 6. Migration Principle

Backend V2 development is not primarily optimizing for long-term coexistence between V1 and V2 Observation models.

The objective is convergence toward the canonical Observation model.

Therefore:

* compatibility layers are temporary
* projections are temporary
* bridge structures are temporary
* V1 ownership assumptions are temporary

Migration artifacts should not become permanent architecture.

---

# 7. Future Work Interpretation

Future Observation work should be evaluated against a simple question:

> Does this move the repository closer to the Observation Bundle Contract?

If the answer is no, the work should be challenged before proceeding.

Examples:

### Valid Direction

```text
Observation Bundle
↓
Ownership
↓
Persistence
↓
Cleanup
```

### Invalid Direction

```text
Observation Bundle
↓
Increasingly elaborate V1 compatibility
↓
Permanent bridge architecture
```

Compatibility work is justified only when it materially assists migration toward Backend V2.

---

# 8. Authority Cutover Declaration

Effective immediately:

The Observation Bundle Contract is the authoritative definition of Observation within Backend V2 planning and development.

The following are no longer authoritative:

* fragment-first Observation definitions
* summary-first Observation definitions
* category-first Observation definitions
* repository-shaped Observation definitions
* API-shaped Observation definitions

They may continue to exist operationally during migration.

They no longer define Observation.

---

# 9. Final Rule

When uncertainty arises regarding Observation design, ownership, persistence, migration, or future layer integration:

1. Consult the Observation Bundle Contract.
2. Consult the Observation Philosophy.
3. Consult the Backend V2 Canon.

Do not derive Observation definitions from:

* existing repository constraints,
* V1 compatibility structures,
* downstream consumer expectations,
* or historical implementation details.

Observation authority originates from the Backend V2 Observation model and flows outward from there.
