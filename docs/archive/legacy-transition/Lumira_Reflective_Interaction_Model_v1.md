# Lumira Reflective Interaction Model v1

## 1. Purpose

This document defines Lumira’s long-term reflective interaction model.

It extends the existing interaction principles with a clearer model for:

* reflective dream-space architecture
* route vs state decisions
* attention and pacing
* AI question behavior
* memory and continuity surfaces
* backend-to-UX translation
* how future observation, latent, glossary, highlight, and work systems should appear in the user experience

This is not a visual design specification, component library, or implementation ticket.

Its purpose is to keep the UX redesign, model redesign, and future DB/schema redesign aligned.

---

# 2. Core Thesis

Lumira is not primarily a route-heavy dream workflow engine.

Lumira is a gradually deepening reflective dream workspace.

The system should not primarily drive the user through a fixed sequence.

It should hold attention around the dream and invite depth progressively.

### From workflow

Dream → Frame → Direction → Work → Summary

### Toward dream-space

Dream → Reflective Space

Within that space, the user may encounter:

* motifs
* highlights
* notes
* reflective prompts
* recurrence signals
* glossary links
* memory traces
* continuations
* unresolved elements
* related dreams
* optional deeper work

The primary interaction is not progression.

The primary interaction is deepening.

---

# 3. Foundational Product Model

Lumira should feel like:

* a personal dream workspace
* a contemplative dream instrument
* a memory and reflection environment
* a continuity-aware companion

Lumira should not feel like:

* a productivity workflow
* a coaching funnel
* a chatbot
* a dream-analysis dashboard
* an authoritative interpretation engine
* a gamified self-improvement system

The product’s value is not that it tells the user what the dream means.

The value is that it helps the user sustain reflective continuity around dreams over time.

---

# 4. Primary Unit: Dream-Space

The core unit of Lumira is the dream-space.

A dream-space is the living reflective environment around one dream.

It includes:

* the original dream text
* generated frame/context
* user highlights
* user notes
* saved answers
* reflective prompts
* active or dormant continuations
* linked glossary motifs
* recurrence signals
* related dreams
* unresolved or revisitable elements

A route may display part of the dream-space, but the route is not the conceptual unit.

Long-term, many current routes may become states or focus modes inside the same dream-space.

---

# 5. Route vs State Model

## Short-term alpha model

For alpha, routes may remain separate for implementation safety:

* New Dream
* Frame
* Direction
* Work
* Summary
* Glossary
* Archive

This keeps runtime behavior easier to debug, validate, and stabilize.

## Long-term model

Over time, several current routes should be understood as states or layers inside the dream-space:

| Current concept | Long-term interpretation                     |
| --------------- | -------------------------------------------- |
| Frame           | Reflective context layer                     |
| Direction       | Attention weighting layer                    |
| Work            | Active inquiry / reflective activation layer |
| Summary         | Main dream workspace                         |
| Glossary        | Memory continuity layer                      |
| Highlights      | User-owned attention markings                |

The deeper shift is conceptual:

routes are implementation containers;
states are the actual reflective experience.

---

# 6. New Dream Capture Model

New Dream is not the reflective workspace.

New Dream is memory preservation.

Its purpose is rapid, low-friction capture before dream memory fades.

Desired qualities:

* immediate
* quiet
* text-first
* low cognitive load
* minimal controls
* no analysis pressure
* no heavy AI presence
* no instrumentation overload

Dream capture alone is a complete successful session.

The user should never feel that they must analyze, process, or improve the dream immediately after writing it.

---

# 7. Reflective Dream-Space Surface Hierarchy

## 7.1 Dream Surface

The Dream Surface is the center of the experience.

It contains:

* original dream text
* readable dream reconstruction if needed
* user highlights
* attached notes
* subtle inline signals
* entry points into deeper reflection

The dream itself remains primary.

The UI should not bury the dream under cards, panels, dashboards, or AI outputs.

---

## 7.2 Reflective Activation Layer

This is the future evolution of the current work/card system.

It contains optional reflective openings that emerge from the dream-space.

Examples:

* a question about a highlighted moment
* a continuation prompt around an unresolved scene
* a comparison prompt for a recurring motif
* a gentle emotional observation
* a request to stay with a particular image or feeling

This layer should not feel like a mandatory workflow.

It should feel like invitations appearing near meaningful material.

---

## 7.3 Memory Layer

This layer contains cross-session continuity.

It includes:

* glossary motifs
* recurrence history
* user notes on motifs
* related dreams
* personal meaning annotations
* motif aliases
* do-not-surface preferences

The memory layer is user-owned and inspectable.

It may support reflection but must not override the current dream.

---

## 7.4 Orientation Layer

This layer helps the user understand where they are in the reflective space.

It may include:

* current focus
* open threads
* saved responses
* revisit points
* unresolved elements
* gentle indicators of depth or continuity

It should not become a progress system or achievement layer.

---

## 7.5 Optional Deep Reflection Layer

This layer supports deeper structured work when invited by the user.

Examples:

* guided reflective sequences
* motif comparison across dreams
* emotional pattern review
* agency/presence exploration
* relationship pattern review
* lucid/metacognitive reflection

This layer is optional.

Depth is invited, not imposed.

---

# 8. AI Question Model

AI questions are not the core structure of Lumira.

They are one form of reflective activation inside the dream-space.

The system should not feel like:

* a chatbot asking questions
* a form wizard
* a coaching sequence
* a locked card progression
* an AI interrogating the user

Instead, AI questions should appear as contextual invitations.

## 8.1 What an AI question is

An AI question is a soft attention proposal.

It says, in effect:

“This part of the dream may be worth staying with. Would you like to look here?”

It does not say:

“This is what the dream means. Answer this to proceed.”

---

## 8.2 Where questions appear

AI questions may appear:

* near a highlighted dream fragment
* below a motif or glossary link
* inside a reflective thread
* in a continuation panel
* in the dream workspace as an optional prompt
* after a user selects or marks something meaningful
* when returning to a dream later

They should not dominate the entire screen by default.

---

## 8.3 How questions shape flow

Lumira AI should shape the flow by weighting attention, not by enforcing a route.

It can:

* suggest where to look next
* remember what the user has already explored
* avoid repeating the same reflective move
* connect current material to previous dreams
* notice unresolved elements
* offer alternative angles
* slow the user down when needed
* keep the tone non-authoritative

It should not:

* force a single path
* lock the user into one direction
* overproduce questions
* interpret the dream as fact
* convert every insight into a task
* make the user feel evaluated

---

## 8.4 Question states

A question can have several states:

* Suggested
* Opened
* Answered
* Saved
* Deferred
* Dismissed
* Revisited

This allows questions to become part of memory, not just transient chat messages.

---

## 8.5 Question generation sources

AI questions may be informed by:

* current dream text
* observation layer
* frame/context
* user highlights
* glossary recurrence
* previous answers
* saved notes
* direction preferences
* latent hypotheses
* emotional tone
* unresolved loops
* related dreams

But most of these sources should remain invisible or softly translated.

The user should see a good question, not the full machinery behind it.

---

## 8.6 Question tone

Questions should be:

* brief
* grounded in the user’s own dream material
* non-diagnostic
* non-authoritative
* open-ended
* emotionally safe
* easy to ignore
* easy to answer partially

Good pattern:

“When you return to the station scene, what feels most present now: waiting, uncertainty, or the arriving train?”

Avoid:

“This dream clearly shows fear of transition. Why are you resisting change?”

---

## 8.7 Question density

The system should prefer fewer, better questions.

One strong reflective invitation is usually better than a grid of prompts.

The dream-space should remain spacious.

---

# 9. Lumira AI as Flow Shaper

Lumira AI does not control the user’s dream-work path.

It shapes the reflective environment.

Its main flow-shaping functions are:

1. Hold continuity
2. Notice salience
3. Suggest focus
4. Avoid repetition
5. Offer gentle alternatives
6. Translate internal inference into safe reflective invitations
7. Preserve user agency

---

## 9.1 Attention weighting instead of direction locking

Current direction flow can behave like a locked mode.

Long-term, directions should become attention weights.

A direction may influence:

* which questions are suggested
* which motifs are surfaced
* which previous material is considered
* what kind of reflection is invited

But it should not prevent Lumira from asking a better question if another angle becomes more relevant.

---

## 9.2 Flow as reflective thread network

Instead of one linear path, dream-work may become a set of reflective threads.

A thread can begin from:

* a highlight
* a motif
* a question
* a saved answer
* a recurring pattern
* an unresolved scene
* a user note

Threads can remain open, be answered, be revisited, or fade into the background.

---

## 9.3 The AI should know when not to ask

Sometimes the right behavior is not another question.

Lumira may simply:

* hold the dream text in view
* show a previous note
* surface a recurrence marker
* offer a pause
* let the user write freely
* invite returning later

Silence and spaciousness are part of the interaction model.

---

# 10. One-Sentence Definition

Lumira is a reflective dream-space that helps users preserve, revisit, mark, and gently deepen their dreams through personal memory, subtle continuity signals, and non-authoritative AI invitations.
