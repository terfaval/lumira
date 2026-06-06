# Lumira Descriptive Observation Contract v0

## Status

Draft

Conceptual Contract

This document defines the canonical descriptive observation used by the Observation runtime.

This is not:

* a database schema
* an API contract
* an implementation specification

Its purpose is to define what a Descriptive Observation is and how it should behave.

---

# Core Definition

A Descriptive Observation is the smallest durable descriptive unit preserved from dream material.

It represents:

# one observation

supported by dream evidence.

A Descriptive Observation captures something that can be noticed in the dream.

It does not explain why it exists.

It does not interpret what it means.

---

# Primary Purpose

The purpose of a Descriptive Observation is:

* preservation
* orientation
* future reuse

A Descriptive Observation should remain useful for:

* reflection
* glossary generation
* thread formation
* continuity analysis
* UI presentation

without requiring reinterpretation.

---

# Observation Language

Descriptive Observations should be written in the user's primary language.

For the current Lumira runtime:

# Observations should be generated in Hungarian.

Observation text is user-facing material.

It is not an internal machine representation.

---

# Observation Structure

A Descriptive Observation contains:

## Observation

A short descriptive statement.

Examples:

* Egy nagy iskolaépület jelenik meg.
* Az álmodó menekülni próbál a helyzetből.
* A tér hirtelen Budapestté változik.
* A szereplő ráébred arra, hogy álmodik.
* A helyszín fenyegető hangulatot áraszt.

The observation should be understandable on its own.

---

## Category

The category describes the observation's primary organizational dimension.

Examples:

* actor
* location
* interaction
* agency_state
* affective_atmosphere
* metacognitive_moment

Categories organize observations.

Categories do not create observations.

---

## Evidence

Evidence links the observation to dream material.

Examples:

Observation:

> Az álmodó menekülni próbál a helyzetből.

Evidence:

> "menekülni kezdtem"

---

# One Observation, One Noticing

A Descriptive Observation should represent a single bounded noticing.

Good:

* Egy hosszú csigalépcső jelenik meg.
* Az álmodó elveszíti az irányítás érzését.
* Egy ismeretlen férfi követi az álmodót.

Bad:

* Egy hosszú csigalépcső jelenik meg, az álmodó fél, menekül, majd rájön hogy álmodik.

The latter contains multiple observations.

These should be separated.

---

# Shared Evidence

The same evidence may support multiple observations.

Example:

Dream text:

> Egy végtelen folyosón futok, miközben a kijáratot keresem.

Valid observations:

* Egy hosszú folyosó jelenik meg.
* Az álmodó fut.
* Az álmodó kijáratot keres.
* Az álmodó nehezen talál kiutat.
* A tér végtelennek tűnik.

The observations do not compete.

All may coexist.

---

# Descriptive Style

Observations should be:

* concrete
* simple
* direct
* descriptive

Observations should avoid:

* symbolic claims
* interpretation
* psychological conclusions
* hidden meanings
* reflection language

Good:

> A szereplő nem találja a kijáratot.

Bad:

> A szereplő valószínűleg saját élethelyzetében érzi magát csapdában.

---

# Phenomenology As First-Class Material

Phenomenological observations are fully valid observations.

Examples:

* Feszültség jelenik meg a helyzetben.
* Az álmodó bizonytalanságot él át.
* A tér instabillá válik.
* Az álmodó tudatosítja, hogy álmodik.
* A helyszín nyugtalanító hangulatot áraszt.

Phenomenology is not secondary to structure.

Phenomenology is observation.

---

# Continuity As Observation

Observation may preserve continuity-relevant material.

Examples:

* Az álomban ismét egy iskola jelenik meg.
* Az álomban újra felbukkan az apa alakja.
* A menekülés motívuma ismét megjelenik.

Observation does not determine whether continuity exists.

Observation preserves continuity candidates.

---

# Summary Relationship

A Descriptive Observation should be valid without a summary.

A summary may be generated from observations.

Observations should not depend on summary text.

The observation is primary.

The summary is secondary.

---

# UI Principle

A Descriptive Observation should be displayable directly to a user.

If shown in the interface without modification, it should:

* remain understandable
* remain useful
* remain descriptive
* remain non-interpretive

Observation text should therefore be treated as user-facing content.

---

# Success Criteria

A valid Descriptive Observation:

* captures one observation
* is evidence-linked
* is written in Hungarian
* remains descriptive
* can stand alone
* can be shown directly in the UI
* does not interpret
* may share evidence with other observations

The goal is not categorization.

The goal is not summarization.

The goal is the preservation of a single descriptive noticing.
