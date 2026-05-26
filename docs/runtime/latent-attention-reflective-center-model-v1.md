# Latent Attention & Reflective Center Model v1

## Status

Planning Draft — Latent / UX Bridge Contract

This document defines the first conceptual model for how Lumira’s Latent layer supports attentional organization inside Reflective Space, especially Deep Reflection Mode.

It describes:

- what a reflective center is,
- how latent should help select or suggest centers,
- how foreground / midground / background continuity should behave,
- how user validation changes latent confidence,
- how early-stage and mature latent differ,
- how glossary notes, highlights, responses, and observations participate,
- and how latent can support Deep Reflection without becoming an interpretation authority.

This document is:

- planning-level,
- UX-runtime bridging,
- cognition-boundary-defining,
- and implementation-guiding.

It is NOT:

- a schema spec,
- a UI component spec,
- a latent algorithm,
- or a build ticket.

---

# 1. Core Principle

Latent exists to support:

# reflective attention organization

not to deliver final interpretation.

The Latent layer may internally generate hypotheses, continuity possibilities, and reflective relevance estimates.

However:

- latent does not own meaning,
- latent does not decide psychological truth,
- latent does not speak directly as authority,
- and latent does not stabilize meaning without user participation.

Core rule:

# Latent may form hypotheses internally, but user response is required to stabilize meaning.

---

# 2. Primary UX Role of Latent

The primary UX-facing role of Latent is not:

# “what does this dream mean?”

The primary UX-facing role is:

# “what may be worth staying with now?”

In Reflective Space, especially Deep Reflection Mode, latent helps select and organize:

- reflective centers,
- nearby context,
- continuity neighborhoods,
- possible openings,
- dormant but relevant material,
- and structures that should remain silent.

Latent supports attention.

It does not replace reflection.

---

# 3. Reflective Center

A reflective center is:

# the current gravitational focus of reflection.

It may be:

- a dream scene,
- a highlighted fragment,
- an affective transition,
- an agency/metacognitive moment,
- a glossary motif,
- a user note,
- a reflective response,
- a thread,
- a reflective opening,
- or a continuity pattern.

A reflective center should feel like:

# “stay with this.”

Not:

# “solve this.”

---

# 4. Reflective Center Selection Philosophy

Latent should not select centers by raw signal count alone.

A center should become stronger when multiple grounded signals converge.

Potential center-strength inputs include:

| Input | Meaning |
|---|---|
| User highlight | user-owned salience |
| User response | explicit reflective engagement |
| Glossary note | user relationship to a motif |
| Observation | phenomenological substrate |
| Affect structure | emotional movement or density |
| Agency/metacognition | altered control or reflective awareness |
| Recurrence | possible continuity, weak alone |
| Thread history | prior reflective trajectory |
| Suppression/dismissal | user boundary / do-not-push signal |

Important:

# user-owned signals should generally outrank system-inferred signals.

---

# 5. Memory Hierarchy

Latent should distinguish between different kinds of memory.

## 5.1 Raw Memory

What appeared or was recorded.

Examples:

- dream text
- observations
- extracted scenes
- actors
- affect structures
- spatial/dream-state features

Raw memory is useful but not automatically meaningful.

---

## 5.2 User-Confirmed Memory

What the user has marked, written, confirmed, rejected, or connected.

Examples:

- highlights
- glossary pins
- glossary notes
- reflective responses
- user-confirmed motif associations
- explicit “this feels connected” statements
- explicit rejection or suppression

This is high-value memory.

It represents the user’s evolving relationship to the material.

---

## 5.3 Latent Hypothesis Memory

What the system suspects internally.

Examples:

- possible recurrence
- possible unresolved tension
- possible emotional continuity
- possible relational pattern
- possible symbolic resonance

This memory must remain provisional.

It should not become strong simply because the system repeated it.

---

# 6. Glossary as Relational Memory

Glossary is not only recurrence memory.

Glossary is:

# evolving relational memory.

A glossary item may contain not only:

- a recurring motif,
- occurrence history,
- related dreams,

but also:

- user notes,
- emotional associations,
- personal meanings,
- ambivalence,
- uncertainty,
- rejection,
- and changes over time.

This is crucial for latent.

Because a motif is not important only because it repeats.

It becomes important because:

# the user has a relationship to it.

Example:

Observation:

```txt
scarecrow appeared
```

Glossary note:

```txt
It feels frightening but also strangely protective.
```

Latent should treat the glossary note as stronger meaning-context than raw recurrence alone.

---

# 7. User Validation Loop

Latent hypotheses should evolve through reflective interaction.

The safe loop is:

```txt
Observation / Memory
    -> Latent hypothesis
    -> Reflective opening
    -> User response
    -> Strengthen / weaken / revise / reject hypothesis
```

Meaning should stabilize only when:

- evidence is strong,
- user response resonates,
- the user confirms connection,
- the pattern appears across multiple grounded contexts,
- or the user repeatedly returns to it.

Meaning should weaken when:

- the user rejects it,
- evidence remains thin,
- recurrence is only lexical,
- the user ignores it repeatedly,
- or suppression/defer signals are present.

---

# 8. Early vs Mature Latent

Latent should behave differently depending on how much grounded relational memory exists.

---

## 8.1 Early Latent

Early latent exists when there are:

- few dreams,
- few highlights,
- few glossary notes,
- few user responses,
- little confirmed continuity,
- little stable relationship memory.

Early latent should be:

- cautious,
- exploratory,
- question-oriented,
- atmosphere-sensitive,
- low-confidence,
- silence-friendly.

It should avoid:

- deep continuity claims,
- repeated resurfacing,
- strong pattern language,
- identity-like hypotheses,
- “this keeps appearing” pressure.

Early Deep Reflection should usually focus on:

# present-material reflection

rather than long-range continuity.

---

## 8.2 Mature Latent

Mature latent exists when there are:

- multiple reflective objects,
- user-confirmed highlights,
- glossary notes,
- reflective responses,
- recurring motifs with user context,
- thread history,
- accepted and rejected openings,
- meaningful continuity over time.

Mature latent may support:

- stronger continuity neighborhoods,
- more precise reflective centers,
- resurfacing of validated motifs,
- deeper openings,
- relational symbolic memory,
- careful cross-object continuity.

But even mature latent remains:

- probabilistic,
- revisable,
- non-authoritative,
- user-led.

---

# 9. Foreground / Midground / Background

Latent should help organize reflective material into attentional layers.

## 9.1 Foreground

Foreground is:

# what may be engaged now.

Only a small number of structures may be foregrounded.

In Deep Reflection, typically one center dominates.

Foreground candidates require stronger support:

- user salience,
- recent engagement,
- strong evidence,
- validated continuity,
- emotionally meaningful density,
- or explicit user pull.

---

## 9.2 Midground

Midground is:

# nearby, relevant, but not demanding.

Examples:

- related dream excerpts,
- connected glossary motifs,
- adjacent highlights,
- prior responses,
- related but weaker threads.

Midground helps the user feel context without pressure.

---

## 9.3 Background

Background is:

# dormant, weak, old, suppressed, or currently non-central continuity.

Background remains accessible but quiet.

Background must not auto-promote itself without strong reason.

Suppressed or dismissed structures usually remain background or silent.

---

# 10. Deep Reflection Mode Requirements

In Deep Reflection Mode, latent should support:

- one dominant reflective center,
- nearby context only,
- low foreground density,
- reduced continuity pressure,
- writing-first attention,
- optional openings,
- silence legitimacy.

Latent should not:

- present many competing centers,
- surface raw internal hypotheses,
- create analysis dashboards,
- keep reintroducing dormant material,
- or behave like a chatbot trying to continue the session.

Deep Reflection should feel like:

# staying with one living line of attention.

---

# 11. Center Strength and Stabilization

A latent center should have a lifecycle.

Possible states:

| State | Meaning |
|---|---|
| possible | weak signal, not yet validated |
| emerging | repeated or emotionally salient, still tentative |
| user_resonant | user response or note supports it |
| stabilized | multiple evidence types + user confirmation |
| weakened | user rejected, ignored, or evidence stayed weak |
| suppressed | user asked not to surface it |

Important:

A center should not move upward by system repetition alone.

It should strengthen through:

- evidence diversity,
- user engagement,
- explicit confirmation,
- cross-object grounding,
- and stable relationship memory.

---

# 12. Anti-Amplification Rules

Latent must avoid reinforcing itself.

Rules:

1. Repeated lexical similarity is not enough.
2. Repeated AI-generated phrasing is not evidence.
3. Multiple snapshots of the same object should not inflate confidence.
4. Recurrence count alone does not equal meaning strength.
5. Weak evidence should weaken confidence, not amplify speculation.
6. Ignored openings should reduce resurfacing pressure.
7. User suppression must override inferred relevance.

---

# 13. Scope Discipline

Latent should distinguish:

- object-local context,
- thread-local context,
- glossary-local context,
- user-global context.

User-global memory should not automatically enter every latent decision.

A global memory item should influence a current center only when there is sufficient overlap, such as:

- shared user-confirmed glossary motif,
- explicit user connection,
- strong affective similarity with evidence,
- thread membership,
- repeated confirmed relationship,
- or recent user engagement.

Default rule:

# local before global.

---

# 14. Silence and Non-Selection

Latent should be allowed to choose no strong center.

This is especially important in early-stage use.

Valid outcomes:

- no opening,
- weak orientation only,
- present-material reflection,
- “nothing needs to be resurfaced now,”
- quiet capture/re-entry.

Silence is not failure.

Silence is a pacing tool.

---

# 15. Relationship to Openings

Openings are how latent may gently test hypotheses with the user.

Good openings:

- invite reflection,
- preserve ambiguity,
- avoid conclusion,
- expose only enough context,
- allow rejection or non-response.

Openings should help answer:

# “Does this resonate?”

not declare:

# “This is what is happening.”

---

# 16. Relationship to UX

Latent should provide material for UX layers, but UX must not expose raw latent cognition.

Safe UX uses:

- reflective centers,
- nearby context,
- gentle openings,
- continuity cues,
- glossary-linked memories,
- user-confirmed anchors.

Unsafe UX exposes:

- raw hypotheses,
- confidence scores,
- diagnostic pattern claims,
- symbolic interpretation graphs,
- “AI knows you” narratives.

---

# 17. C-Level Direction

C-level latent may eventually support:

- symbolic density estimation,
- relational dynamic hypotheses,
- cross-object continuity clustering,
- reflective topology,
- motif relationship modeling,
- long-range continuity arcs.

But these must remain:

- latent-only or transformed before surfacing,
- probabilistic,
- user-validated,
- evidence-weighted,
- non-authoritative,
- and suppressible.

C-level must not become:

- user identity modeling,
- psychological diagnosis,
- symbolic certainty,
- mythology generation,
- or therapeutic authority.

---

# 18. Open Planning Questions

These need future decisions before implementation:

1. What exact signals make a reflective center eligible for foreground?
2. How many user confirmations are required before a hypothesis stabilizes?
3. How should ignored openings weaken latent hypotheses?
4. How strongly should glossary notes outweigh raw recurrence?
5. When may user-global memory enter an object-local reflection?
6. How should the system represent rejected hypotheses internally?
7. Should latent maturity be computed globally, per motif, per thread, or per user?
8. How should Deep Reflection differ between early and mature latent states?
9. What must never be surfaced, even if latent confidence becomes high?

---

# 19. Implementation Direction

The first implementation phase should focus on governance, not intelligence expansion.

Recommended first build direction:

- provenance/evidence-aware center scoring,
- user-confirmation weighting,
- glossary note ingestion rules,
- anti-amplification / refractory behavior,
- local-before-global scope discipline,
- no-center/silence outcome support,
- Deep Reflection center candidate preparation.

Do NOT begin with:

- symbolic density scoring,
- relational inference,
- identity trajectories,
- psychological explanation models,
- or raw latent surfacing.

---

# 20. Final Principle

Latent should help Lumira remember and orient without claiming to know.

It should become better at asking:

# “Is this worth staying with?”

before it ever tries to answer:

# “What does this mean?”
