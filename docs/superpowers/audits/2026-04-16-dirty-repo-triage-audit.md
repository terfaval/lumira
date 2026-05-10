# Dirty Repo Triage Audit (2026-04-16)

## 1) Current Dirty Surface

### Root Status Summary

- The root workspace contains a mixed dirty surface: active-looking application file edits, stabilization/audit document work, a deleted binary asset, and a nested-repo/worktree anomaly.
- The dirty state is not one coherent thread. It combines likely user-owned product edits with repo-control artifacts created during the stabilization-analysis sequence.
- `git diff --cached --name-only` is empty, so the current ambiguity is entirely in the unstaged and untracked workspace state.

### Dirty Items

| item | status kind | notes |
|---|---|---|
| app/api/sessions/[sessionId]/highlights/reject/route.ts | modified | Type-safety cleanup in a live API route; appears product-code oriented rather than audit-only. |
| app/glossary/page.tsx | modified | Glossary page edits include type narrowing and effect timing changes; likely active UI/product work. |
| app/glossary/suggestions/page.tsx | modified | Suggestion page edits mirror glossary UI cleanup and runtime behavior adjustments. |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | modified | One-line adjustment to prior stabilization audit candidate-removal list. |
| public/background/evening.png | deleted | Deleted binary asset with prior history tied to background and CSS enhancement work. |
| docs/superpowers/specs/2026-04-16-stabilization-control-audit-design.md | untracked | Newly created stabilization-control audit spec from the current audit thread. |
| docs/superpowers/plans/2026-04-16-stabilization-control-audit.md | untracked | Newly created implementation plan for the stabilization-control audit. |
| docs/superpowers/audits/2026-04-16-stabilization-control-audit.md | untracked | Newly created completed stabilization-control audit. |
| docs/superpowers/specs/2026-04-16-dirty-repo-triage-audit-design.md | untracked | Newly created dirty-repo triage spec from the current governance thread. |
| docs/superpowers/plans/2026-04-16-dirty-repo-triage-audit.md | untracked | Newly created implementation plan for the dirty-repo triage audit. |
| docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md | untracked | Newly created dirty-repo triage audit artifact. |
| mira | nested git repo marker | `git status` shows `m mira`; `mira/.git` exists and indicates nested-repo or embedded-worktree residue inside the root workspace. |

## 2) Ownership and Intent

| item | likely owner/thread | evidence | safe to touch | confidence |
|---|---|---|---|---|
| app/api/sessions/[sessionId]/highlights/reject/route.ts | likely active product work | diff shows targeted type cleanup in a live API route; file history is normal app development, not stabilization docs | no | medium |
| app/glossary/page.tsx | likely active product/UI work | diff changes runtime behavior and typing in glossary page; commit history is glossary feature/UI work | no | high |
| app/glossary/suggestions/page.tsx | likely active product/UI work | diff changes suggestion-page typing and effect scheduling; commit history is glossary UI work | no | high |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | stabilization follow-up thread | path is a landed stabilization artifact and diff edits the DB-removal section | yes, but only as explicit stabilization work | high |
| public/background/evening.png | ambiguous user/product asset work | deleted binary asset previously added with background/CSS enhancements; no direct stabilization linkage | no | medium |
| 2026-04-16 audit docs under docs/superpowers/** | current governance audit thread | files were created in this session for stabilization-control and dirty-repo audits | yes | high |
| mira nested repo marker | stale environment/worktree residue or embedded repo | `mira/.git` exists and root status shows lowercase `m` nested-repo signal | no | medium |

## 3) Control Impact

| item | planning risk | branch/worktree risk | overwrite/confusion risk | summary |
|---|---|---|---|---|
| app/api/sessions/[sessionId]/highlights/reject/route.ts | medium | low | high | likely active code work; accidental cleanup or stash would risk losing live product edits unrelated to repo control |
| glossary page edits | high | medium | high | likely active user-facing work and should be protected from any repo-control normalization pass |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | medium | low | medium | useful stabilization context, but leaving it mixed into `main` muddies which audit version is authoritative |
| public/background/evening.png deletion | medium | low | medium | asset deletion may be intentional, but ownership is ambiguous and could create UI regressions if handled casually |
| 2026-04-16 audit docs under docs/superpowers/** | low | low | low | these docs are self-contained governance artifacts; they add workspace dirtiness but not product-code execution risk |
| mira nested repo marker | high | high | high | nested repo residue obscures what belongs to the root repo versus an embedded git context and complicates future cleanup decisions |

## 4) Triage Classification

| item | label | rationale | future handling direction |
|---|---|---|---|
| app/api/sessions/[sessionId]/highlights/reject/route.ts | do-not-touch | likely active route maintenance with no evidence it belongs to stabilization-control cleanup | protect during repo-control cleanup and triage separately as product work |
| glossary page edits | do-not-touch | likely active product/UI changes with live behavior implications and no stabilization ownership signal | exclude from any control cleanup until explicitly reviewed as glossary work |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | salvage | directly tied to stabilization context and may need isolation before the next control-system step | separate from unrelated dirty items in a later repo-control pass |
| public/background/evening.png deletion | unknown | deletion is real, but ownership and intent are ambiguous from available evidence | confirm owner/intent before any cleanup or restoration decision |
| 2026-04-16 audit docs under docs/superpowers/** | active | current governance thread artifacts created intentionally to restore execution clarity | keep together and isolate as a single docs thread later |
| mira nested repo marker | stale | embedded git marker appears to be environmental residue rather than active planned work | inspect and isolate in a later explicit cleanup pass, not during design work |

## 5) Next Control Actions

1. Separate the current governance audit docs from unrelated product-file edits before creating any new execution control ledger or branch of record.
2. Protect the glossary and session-route changes as likely active product work and exclude them from repo-control cleanup decisions.
3. Revisit the modified `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md` as a salvageable stabilization artifact after the dirty surface is partitioned by ownership.
4. Investigate the `mira` nested git marker in a dedicated cleanup pass before doing any broader repo normalization, because it creates high confusion risk.
5. Confirm the intent behind the deleted `public/background/evening.png` before any cleanup, reset, or restoration decision.

## 6) Audit Constraint

This audit is read-only. It does not stash, revert, delete, move, or commit dirty items. It only classifies them for future control decisions.
