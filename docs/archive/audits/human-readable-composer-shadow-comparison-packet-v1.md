# Human-Readable Composer Shadow Comparison Packet v1

## Purpose

This packet compares how summary/re-entry feels in two modes:

- current legacy behavior (authoritative)
- guarded composer shadow behavior (comparison only)

It is written for non-technical owner review and focuses on Lumira feel: calmness, spaciousness, pacing, continuity pressure, and interpretive posture.

## Guard and containment

Shadow mode for these comparisons:
- `REFLECTIVE_COMPOSER_SHADOW_ENABLED=1`
- `reflective_shadow_mode=composer`

Containment remains unchanged:
- legacy `/api/session-summary` output stays authoritative
- composer output is additive shadow-only information
- no route ownership transfer
- no persistence/schema/Supabase changes

## Sample source note

These comparisons use deterministic realistic fixtures (not live production cohorts), based on the existing guarded shadow + triage setup.

## Sample 1: Calm/simple return

### A. Legacy posture

The current system gives a gentle return point with light continuity and little pressure to continue.

### B. Composer shadow posture

The composer keeps a similar center and may slightly reduce surrounding noise, keeping the return posture calm.

### C. Plain-language comparison

What shifted:
- small center/ambient emphasis differences only

Feel impact:
- calmer or equivalent
- no noticeable continuity pressure increase
- still spacious and optional

### D. Owner review prompts

- Which version feels calmer?
- Which version leaves more room?
- Did either version feel too certain?
- Did either version feel emotionally pushy?
- Did either version feel more like a task system?
- Which version feels more like Lumira?

## Sample 2: Sparse/minimal return

### A. Legacy posture

The current system allows a near-silent return with minimal active continuity.

### B. Composer shadow posture

The composer also preserves minimalism and does not force extra continuity when evidence is weak.

### C. Plain-language comparison

What shifted:
- little to no practical change

Feel impact:
- equivalent calmness
- strong silence legitimacy
- no interpretive push

### D. Owner review prompts

- Which version feels calmer?
- Which version leaves more room?
- Did either version feel too certain?
- Did either version feel emotionally pushy?
- Did either version feel more like a task system?
- Which version feels more like Lumira?

## Sample 3: Emotionally loaded return

### A. Legacy posture

The current system keeps a clearer established center and avoids over-expanding uncertain competing cues.

### B. Composer shadow posture

The composer can shift center emphasis under ambiguity, still without hard safety leakage, but with a different felt focus.

### C. Plain-language comparison

What shifted:
- center priority can change

Feel impact:
- not clearly unsafe, but potentially more interpretive if not tightly constrained
- can feel less settled than legacy in sensitive moments

### D. Owner review prompts

- Which version feels calmer?
- Which version leaves more room?
- Did either version feel too certain?
- Did either version feel emotionally pushy?
- Did either version feel more like a task system?
- Which version feels more like Lumira?

## Sample 4: Dense symbolic return

### A. Legacy posture

The current system keeps density bounded so one center stays legible.

### B. Composer shadow posture

In this risk fixture, composer output becomes too crowded, reducing breathing room.

### C. Plain-language comparison

What shifted:
- more simultaneous continuity surfaced than acceptable

Feel impact:
- denser and more pressuring
- less spacious
- does not meet Lumira calmness bar in this form

### D. Owner review prompts

- Which version feels calmer?
- Which version leaves more room?
- Did either version feel too certain?
- Did either version feel emotionally pushy?
- Did either version feel more like a task system?
- Which version feels more like Lumira?

## Sample 5: Defer/suppression-risk return

### A. Legacy posture

The current system keeps deferred/suppressed material out of active pressure surfaces.

### B. Composer shadow posture

In this risk fixture, suppressed/deferred continuity leaks into visible active context.

### C. Plain-language comparison

What shifted:
- protected continuity resurfaced when it should stay quiet

Feel impact:
- breaks trust and calmness
- feels emotionally pushy
- immediate no-go until eliminated

### D. Owner review prompts

- Which version feels calmer?
- Which version leaves more room?
- Did either version feel too certain?
- Did either version feel emotionally pushy?
- Did either version feel more like a task system?
- Which version feels more like Lumira?

## Overall owner-facing read

- Composer appears promising in calm/sparse scenarios.
- Composer remains risky where density overflows or suppression safety breaks.
- Default route switch remains blocked.
- Composer should remain shadow-only until hard safety classes are consistently zero and owner review confirms Lumira feel in emotionally sensitive scenarios.

## Optional technical appendix (minimal)

- calm/simple: warn-level drift only, future guarded experiment posture
- sparse/minimal: no meaningful diffs, future guarded experiment posture
- emotionally loaded: center mismatch, shadow-only posture pending owner review
- dense symbolic: density overflow, blocked posture
- suppression-risk: suppression mismatch/visibility leak, blocked posture
