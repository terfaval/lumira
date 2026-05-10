# Dirty Repo Triage Audit Design

Date: 2026-04-16
Repo: c:\mira
Owner timezone: Europe/Budapest

## 1) Goal

- Produce a read-only dirty-repo triage audit that classifies current repository "dirtiness" by control impact rather than by generic cleanup rules.
- Distinguish between changes that are active, salvageable, parkable, stale, or not safe to touch.
- Restore enough repo control to safely design the next execution system without collapsing into broad cleanup work.

## 2) Scope

In scope:
- Current working tree status in `main`.
- Untracked, modified, and deleted files relevant to execution control.
- Nested-repo or linked-worktree residue visible from the root workspace.
- Existing stabilization-related docs, branches, and worktrees when needed to classify ownership and intent.
- Classification of dirty assets into `active`, `salvage`, `park`, `stale`, `discard-candidate`, or `do-not-touch`.

Out of scope:
- Performing cleanup actions.
- Stashing, deleting, reverting, committing, or moving changes.
- Full repo hygiene, lint cleanup, or style cleanup.
- Re-planning the stabilization program itself.

## 3) Problem Statement

The repo is not merely "dirty" in the normal sense of having local modifications.
The real problem is control ambiguity:
- some changes may belong to active product work,
- some may be leftovers from stabilization or audit work,
- some may be historical residue from worktrees or nested repos,
- and some may be unrelated user work that must not be touched.

Without classifying this dirty state first, any new execution control system would be built on top of an unreliable workspace baseline.

## 4) Audit Principle

This audit must be control-first, not cleanup-first.

That means:
- the key question is not "how do we make `git status` clean?"
- the key question is "which dirty items block reliable execution control, and what kind of action would they eventually require?"

The audit must prefer classification over remediation.

## 5) Audit Questions

The audit must answer these questions directly:

1. Which dirty items are currently present in the root workspace?
2. Which dirty items appear to be active user work and must not be touched?
3. Which dirty items belong to stabilization or audit work but are not yet isolated properly?
4. Which dirty items are likely stale residue from prior worktrees, nested repos, or abandoned threads?
5. Which dirty items block safe planning or branch-of-record selection?
6. Which items could later be parked, salvaged, or discarded without affecting active user work?

## 6) Evidence Sources

Required read-only evidence sources:
- `git status --short`
- `git diff --name-only`
- `git diff --cached --name-only` if needed
- `git submodule status` or equivalent nested-repo inspection if needed
- `git worktree list`
- selective file reads for suspicious paths

Optional supporting evidence:
- `git ls-files`
- `git log -- path`
- existing stabilization audits and plans

## 7) Output Structure

The audit document must contain these sections:

### A. Current Dirty Surface
- root workspace status
- categories of dirty items
- notable anomalies such as nested repo markers or deleted assets

### B. Ownership and Intent
- likely owner or thread
- whether the change appears active, abandoned, or ambiguous
- whether it is safe to touch

### C. Control Impact
- does the item block clean planning?
- does it block branch isolation?
- does it create risk of accidental overwrite or confusion?

### D. Triage Classification
- one label per item or grouped item set
- recommended future handling direction, but no action taken yet

### E. Next Control Actions
- only the minimum future actions needed before setting up the execution control system

## 8) Classification Rules

Allowed triage labels:
- `active`
- `salvage`
- `park`
- `stale`
- `discard-candidate`
- `do-not-touch`
- `unknown`

Definitions:
- `active`: clearly part of ongoing intentional work and should remain in place for now.
- `salvage`: worth extracting or isolating later because it likely contains useful work.
- `park`: should be moved out of the active execution surface later, but not deleted.
- `stale`: appears leftover and not part of any current intentional thread.
- `discard-candidate`: likely removable later, but only after explicit confirmation.
- `do-not-touch`: likely belongs to the user or a live thread outside this audit's authority.
- `unknown`: insufficient evidence to classify safely.

## 9) Constraints

- No file edits outside the audit artifact itself.
- No git cleanup commands.
- No branch deletion or worktree removal.
- No auto-stash or auto-commit behavior.
- No inference that a file is disposable unless the evidence is strong.
- Bias toward `do-not-touch` when ownership is uncertain.

## 10) Definition of Done

The audit is complete when:
- the current dirty surface is enumerated,
- each relevant dirty item is classified by control impact,
- ambiguous ownership is called out explicitly,
- blocking items for future execution control are identified,
- and the next control-system step can start from a safer workspace understanding.

## 11) Expected Follow-On Step

After this audit is reviewed, the next step may be a limited repo-control cleanup or isolation pass.

That pass is intentionally excluded from this document.
