# Glossary V2 — Match and Resolution Contract

## Status

Planning Canon

Backend V2 Foundation Layer

---

# Purpose

This document defines how Glossary V2 moves from:

```text
Observation
↓
Candidate
↓
Continuity Entity
↓
Appearance Record
```

It defines:

* Match Candidates
* Ambiguous Matches
* Resolution behavior
* Appearance creation rules
* Matching authority boundaries

This document does not define implementation details.

---

# Core Principle

The system may suggest continuity.

The dreamer confirms continuity.

The system never owns continuity.

The dreamer owns continuity.

---

# Matching Authority

Matching is advisory.

Matching is not confirmation.

A match suggestion is never equivalent to an Appearance Record.

Only user confirmation creates continuity history.

---

# Candidate Classes

Glossary V2 supports four candidate classes.

---

## 1. Match Candidate

A possible appearance of an existing Continuity Entity.

Example:

```text
Observed:
Apa

Existing Entity:
Apa
```

or

```text
Observed:
apu

Alias:
Apa
```

The system proposes:

```text
Match Candidate
```

The system does not create an Appearance Record.

The dreamer decides.

---

## 2. Ambiguous Match Candidate

A possible appearance that could belong to multiple Continuity Entities.

Example:

```text
Observed:
exem

Possible Matches:
- Dóri
- Réka
```

The system proposes:

```text
Ambiguous Match Candidate
```

The system does not choose.

The dreamer chooses.

---

## 3. New Candidate

An observed element with no sufficient continuity match.

Example:

```text
Observed:
Mammut
```

The system proposes:

```text
New Candidate
```

The dreamer may create a new Continuity Entity.

The dreamer may ignore it.

---

## 4. No Candidate

The system may choose not to suggest anything.

Example:

```text
background details
common scenery
repeatedly ignored suggestions
```

No candidate is a valid outcome.

---

# Unknown Role Continuity

Sometimes a continuity role exists without a known identity.

Example:

```text
Observed:
az exem
```

The dreamer may choose:

```text
Unknown Ex-partner
```

instead of:

```text
Dóri
Réka
```

Identity resolution is optional.

Continuity may exist without identity resolution.

---

# Appearance Record Creation

Appearance Records may only be created through:

```text
User Confirmation
```

Not through:

* Observation
* Candidate generation
* Matching
* Alias recognition
* Ambiguity detection
* LLM output

---

# Matching Hierarchy

Glossary V2 follows:

```text
1. Normalized Exact Match

2. Alias Match

3. Ambiguous Match

4. New Candidate

5. No Candidate
```

The hierarchy is evaluated in order.

The first successful level does not automatically create continuity.

It only creates a candidate.

---

# Normalized Exact Match

Uses the shared recognition normalization layer.

Examples:

```text
Kozmó
Kozmo
```

↓

```text
kozmo
```

```text
Dóri
dori
```

↓

```text
dori
```

A normalized match creates a Match Candidate.

It does not create an Appearance Record.

---

# Alias Match

Matches against user-owned aliases.

Example:

```text
Observed:
apu

Alias:
apu

Entity:
Apa
```

Result:

```text
Match Candidate
```

Not:

```text
Confirmed Appearance
```

---

# Ambiguous Match

Occurs when multiple entities remain plausible.

Example:

```text
Observed:
exem

Possible:
- Dóri
- Réka
- Unknown Ex-partner
```

The system presents ambiguity.

The dreamer resolves ambiguity.

The system never resolves ambiguity automatically.

---

# Suppression Behavior

Repeatedly ignored suggestions may become less visible over time.

Suppression affects suggestion behavior only.

Suppression does not:

* delete entities
* delete appearances
* create continuity conclusions

---

# LLM Boundary

Glossary V2 is deterministic-first.

The primary matching path is:

```text
Normalization
↓
Alias Recognition
↓
Candidate Generation
```

LLM usage is optional and future-facing.

If introduced later:

```text
LLM may suggest continuity.
LLM may not resolve continuity.
```

LLM output is advisory only.

---

# Explicit Non-Goals

This contract does not include:

* Hungarian morphology engine
* nickname inference
* semantic interpretation
* relationship graph
* latent reasoning
* dream meaning generation
* automatic continuity confirmation

These may be introduced later as separate systems.

---

# Final Authority Rule

The final authority is always:

```text
The Dreamer
```

Not:

* Observation
* Glossary
* Matching Engine
* Alias System
* LLM
* Latent
* AI Interpretation

Continuity becomes real only when the dreamer confirms it.
