# Lumira Reflective Composer Model v1

## Purpose

This document defines the interaction philosophy and behavioral model of reflective writing inside Lumira’s Reflective Space.

It describes:

* how reflective writing appears,
* how users enter and continue reflective engagement,
* how reflective responses attach to dream structures,
* how threads relate to writing,
* and how Lumira avoids collapsing into chatbot, workflow, or note-app interaction patterns.

This document is:

* interaction-focused,
* UX-oriented,
* implementation-agnostic.

It is NOT:

* a database specification,
* a component implementation guide,
* or a visual design document.

---

# 1. Core principle

The primary interaction primitive of Reflective Space is:

# reflective responding.

The user is not:

* completing tasks,
* filling forms,
* answering a questionnaire,
* or chatting with an assistant.

The user is:

# remaining in relationship with a dream.

Reflective writing therefore behaves as:

* continuous,
* contextual,
* revisitable,
* and continuity-aware.

---

# 2. Composer philosophy

Lumira does not use:

* a single chat input,
* isolated answer forms,
* or disconnected note fields.

Instead:

# reflective writing exists as a layered composer system.

The composer adapts to:

* reflective depth,
* current focus,
* and interaction context.

---

# 3. Two composer modes

Lumira contains two primary composer behaviors:

## A. Inline Composer

## B. Reflective Composer

These are:

* complementary,
* interconnected,
* and context-sensitive.

---

# 4. Inline Composer

Purpose:

# lightweight local reflection.

The Inline Composer appears directly attached to:

* a highlight,
* a motif,
* a glossary element,
* a thread node,
* or a selected dream excerpt.

It is intended for:

* quick associations,
* emotional marking,
* local observations,
* short contextual notes,
* or small continuity additions.

---

## Inline Composer characteristics

The Inline Composer should feel:

* immediate,
* lightweight,
* low-pressure,
* and non-disruptive.

It should:

* expand gently,
* remain visually connected to the originating element,
* and collapse naturally after use.

Inline writing should never:

* feel like opening a workflow,
* entering a separate tool,
* or switching modes aggressively.

---

## Examples of inline interaction

Examples:

* “This reminds me of a recurring childhood feeling.”
* “This hallway appears often.”
* “I think this connects to the hospital dream.”
* “Strong anxiety here.”

These are:

# reflective fragments,

not:

# formal reflective sessions.

---

# 5. Reflective Composer

Purpose:

# sustained reflective engagement.

The Reflective Composer belongs primarily to:

# Deep Reflection Layer.

This is the main writing environment for:

* reflective answers,
* deeper thought development,
* thread continuation,
* associative exploration,
* unresolved tensions,
* and continuity work.

---

## Reflective Composer characteristics

The Reflective Composer should feel:

* calm,
* spacious,
* focused,
* continuity-aware,
* and persistent.

Unlike Inline Composer:

* it is not attached to a single local element,
* but to the current reflective focus state.

---

## Reflective Composer is NOT

It is not:

* a chatbot input,
* a journaling textarea,
* a document editor,
* or a comment thread.

It is:

# an active reflective field.

---

# 6. Reflective focus

The Reflective Composer always exists within:

# a reflective focus context.

Examples:

* a thread,
* a motif,
* a reflective opening,
* an unresolved area,
* a cluster of highlights,
* or a continuity trajectory.

The composer should always communicate:

# “what this reflection is staying with.”

---

# 7. AI reflective openings

AI-generated questions should behave as:

# reflective openings.

Not:

* prompts in a turn-taking conversation,
* or mandatory progression steps.

---

## Reflective openings may appear as

* a subtle question,
* a reframing,
* a tension notice,
* a continuity hint,
* a motif observation,
* a reflective possibility,
* or a gentle invitation.

Examples:

* “This scene seems emotionally dense.”
* “You have highlighted similar enclosed spaces before.”
* “This figure appears unresolved.”
* “There may be more around this transition.”

---

## Important behavioral rule

Reflective openings:

* remain present,
* but do not demand response.

The system should never behave like:

* “waiting for the user to answer.”

This is critical.

---

# 8. Thread relationship model

Reflective writing contributes to:

# reflective threads.

Threads are:

* continuity structures,
* not conversations.

A thread may contain:

* highlights,
* notes,
* responses,
* revisitations,
* glossary links,
* reflective openings,
* and continuity cues.

---

## Thread navigation philosophy

Users navigate:

# through lines of reflection,

not:

# through sequential UI steps.

Threads therefore act as:

* reflective memory,
* continuity scaffolding,
* and return points.

---

# 9. Reflective continuity

The composer system must preserve:

# continuity of thought.

The user should feel:

* able to leave,
* return later,
* resume,
* deepen,
* or reconnect threads naturally.

The system should support:

* unfinished thinking,
* dormant reflections,
* partial insight,
* and revisitation.

---

# 10. Persistence philosophy

Not all writing has equal reflective weight.

Lumira should support multiple persistence intensities.

---

## A. Ephemeral reflection

Examples:

* temporary observations,
* emotional fragments,
* quick associations.

May remain lightweight and locally attached.

---

## B. Persistent reflection

Examples:

* reflective answers,
* continuity-building thoughts,
* motif associations,
* recurring unresolved themes.

Should persist as part of reflective continuity.

---

# 11. Orientation Layer composer behavior

In Orientation Layer:

* reflective writing remains lightweight,
* mostly inline,
* and minimally intrusive.

The system should prioritize:

* orientation,
* perception,
* and reflective scanning.

Not:

* prolonged writing.

Orientation writing should feel like:

# opening reflective doors.

---

# 12. Deep Reflection composer behavior

In Deep Reflection Layer:

* the Reflective Composer becomes primary,
* writing space expands,
* peripheral density reduces,
* and reflective continuity becomes more visible.

This mode prioritizes:

* sustained engagement,
* reflective answering,
* associative expansion,
* and thread deepening.

The user should feel:

# “I am staying with this.”

---

# 13. Mobile philosophy

Mobile reflective writing should:

* preserve calm pacing,
* minimize UI interruption,
* and maintain thumb ergonomics.

---

## Mobile Inline Composer

Should:

* expand contextually,
* avoid full-screen interruption when possible,
* and collapse naturally.

---

## Mobile Reflective Composer

Should:

* support longer writing comfortably,
* preserve nearby reflective context,
* and reduce surrounding chrome during active writing.

During active reflective writing:

* Orientation Layer density should soften,
* unnecessary signals should fade,
* and thread context should remain lightly accessible.

---

# 14. Anti-patterns

Lumira should avoid:

## Chatbot behavior

* turn-taking loops
* assistant waiting states
* sequential questioning
* conversational pressure

---

## Workflow behavior

* mandatory progression
* completion checklists
* forced step advancement
* rigid reflection sequences

---

## Productivity-note behavior

* excessive block structure
* database feeling
* document management UI
* heavy editing metaphors

---

## AI dominance

* long interpretive monologues
* oversized summaries
* constant prompting
* authoritative language

---

# 15. Future evolution direction

The long-term reflective writing system may eventually support:

* reflective resurfacing,
* continuity synthesis,
* motif-linked writing,
* cross-dream reflective trajectories,
* unresolved thread return,
* continuity-aware invitations,
* and reflective topology mapping.

However:
all future evolution should preserve:

# calm reflective presence over productivity interaction.

---

# 16. Final principle

The Reflective Composer should never feel like:

* answering software.

It should feel like:

# continuing a relationship with an inner experience.
