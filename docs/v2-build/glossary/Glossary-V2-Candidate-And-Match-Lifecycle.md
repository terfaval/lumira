# Glossary V2 — Candidate and Match Lifecycle

## Status

Planning Canon

Backend V2 Foundation Layer

---

# Principle

The system may suggest continuity.

The dreamer confirms continuity.

---

# Candidate Types

Three candidate classes exist.

---

## 1. New Candidate

A possible new Continuity Entity.

Example:

```text
Mammut
```

The system suggests preservation.

The user decides whether to create a Glossary Entry.

---

## 2. Match Candidate

A possible appearance of an existing Glossary Entry.

Example:

```text
Observed:
apám

Existing Entry:
Apa
```

The system proposes a connection.

The user confirms or rejects the match.

---

## 3. Ambiguous Match Candidate

Multiple existing entries may match.

Example:

```text
Observed:
az exem

Possible Matches:
- Dóri
- Réka
```

The system never chooses automatically.

The dreamer resolves ambiguity.

---

# Match Confirmation

Confirmed matches become Appearance Records.

Example:

```text
Apa
↓
Dream #42
↓
Confirmed Appearance
```

---

# Match Rejection

Rejected matches do not automatically become new entries.

A rejected match simply means:

```text
Not this continuity entity.
```

The dreamer may later:

* create a new entry
* connect it elsewhere
* ignore it entirely

---

# Candidate Suppression

Ignoring a candidate is different from rejecting a candidate.

Repeatedly ignored candidates may become quieter over time.

Example:

```text
Mammut
```

appears often but is never preserved.

The system should reduce recommendation frequency.

---

# Ownership

All continuity ownership remains with the dreamer.

The system may suggest.

The system may not decide.
