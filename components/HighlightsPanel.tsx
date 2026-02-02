"use client";

import { useMemo, useState } from "react";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import {
  normalizeKind,
  normalizeLabel,
  type HighlightKind,
  type HighlightSuggestion,
} from "@/src/domain/highlights/aggregateSessionSuggestions";
import styles from "./HighlightsPanel.module.css";

export type SessionHighlight = {
  id: string;
  label: string;
  kind: HighlightKind | null;
  note?: string | null;
  source: "user" | "suggested";
  source_ref?: Record<string, unknown> | null;
};

export type HighlightsPanelProps = {
  sessionId: string;
  suggestions: HighlightSuggestion[];
  highlights: SessionHighlight[];
  rejectedKeys?: string[];
  onAdd: (payload: {
    suggestion: HighlightSuggestion;
    kind: HighlightKind;
    note?: string | null;
  }) => Promise<void> | void;
  onReject: (suggestionKey: string) => Promise<void> | void;
  onEdit: (highlight: { id: string; label: string; kind: HighlightKind; note?: string | null }) => Promise<void> | void;
  onCreateCustom: (payload: { label: string; kind: HighlightKind; note?: string | null }) => Promise<void> | void;
  allowLabelEdit?: boolean;
};

const KIND_LABELS: Array<{ key: HighlightKind; label: string }> = [
  { key: "person", label: "Személy" },
  { key: "place", label: "Hely" },
  { key: "object", label: "Tárgy" },
  { key: "theme", label: "Téma" },
  { key: "action", label: "Tett" },
  { key: "feeling", label: "Érzet" },
  { key: "direction", label: "Irány" },
  { key: "other", label: "Egyéb" },
];
const NON_DIRECTION_KINDS = KIND_LABELS.filter((k) => k.key !== "direction");

function kindLabel(kind: HighlightKind | null | undefined) {
  const match = KIND_LABELS.find((k) => k.key === kind);
  return match ? match.label : "Egyéb";
}

export function HighlightsPanel({
  sessionId,
  suggestions,
  highlights,
  rejectedKeys = [],
  onAdd,
  onReject,
  onEdit,
  onCreateCustom,
  allowLabelEdit = true,
}: HighlightsPanelProps) {
  const [customLabel, setCustomLabel] = useState("");
  const [customKind, setCustomKind] = useState<HighlightKind>("other");
  const [customNote, setCustomNote] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editKind, setEditKind] = useState<HighlightKind>("other");
  const [editNote, setEditNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<HighlightSuggestion | null>(null);
  const [modalKind, setModalKind] = useState<HighlightKind>("other");
  const [modalNote, setModalNote] = useState("");

  const rejectedSet = useMemo(() => new Set(rejectedKeys), [rejectedKeys]);
  const acceptedDedup = useMemo(() => {
    const bySuggestionKey = new Set<string>();
    const byLabelKind = new Set<string>();
    for (const h of highlights) {
      const suggestionKey =
        h.source_ref && typeof h.source_ref === "object"
          ? (h.source_ref as any).suggestion_key
          : null;
      if (typeof suggestionKey === "string" && suggestionKey.trim()) {
        bySuggestionKey.add(suggestionKey.trim());
      }
      const kind = normalizeKind(h.kind ?? "other");
      const labelKey = `${kind}:${normalizeLabel(h.label)}`;
      if (labelKey.trim() !== `${kind}:`) byLabelKind.add(labelKey);
    }
    return { bySuggestionKey, byLabelKind };
  }, [highlights]);

  const visibleSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (rejectedSet.has(s.suggestion_key)) return false;
      if (acceptedDedup.bySuggestionKey.has(s.suggestion_key)) return false;
      const labelKey = `${normalizeKind(s.kind)}:${normalizeLabel(s.label)}`;
      if (acceptedDedup.byLabelKind.has(labelKey)) return false;
      return true;
    });
  }, [suggestions, rejectedSet, acceptedDedup]);

  const salientSuggestions = useMemo(
    () => visibleSuggestions.filter((s) => s.group === "salient"),
    [visibleSuggestions]
  );
  const shownSalient = useMemo(() => {
    if (showAllSuggestions) return salientSuggestions;
    return salientSuggestions.slice(0, 3);
  }, [salientSuggestions, showAllSuggestions]);
  const hasMoreSalient = salientSuggestions.length > 3;

  const highlightRows = useMemo(() => {
    return (highlights ?? []).slice().sort((a, b) => a.label.localeCompare(b.label));
  }, [highlights]);

  const beginEdit = (h: SessionHighlight) => {
    setEditId(h.id);
    setEditLabel(h.label);
    setEditKind(normalizeKind(h.kind ?? "other"));
    setEditNote(typeof h.note === "string" ? h.note : "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditLabel("");
    setEditKind("other");
    setEditNote("");
  };

  const submitCustom = async () => {
    const label = customLabel.trim();
    if (!label) return;
    setError(null);
    setPendingKey("custom");
    try {
      const note = customNote.trim() ? customNote.trim() : null;
      await onCreateCustom({ label, kind: customKind, note });
      setCustomLabel("");
      setCustomKind("other");
      setCustomNote("");
    } catch (e: any) {
      setError(e?.message ?? "Nem sikerült menteni.");
    } finally {
      setPendingKey(null);
    }
  };

  const submitEdit = async () => {
    if (!editId) return;
    const label = editLabel.trim();
    if (!label) return;
    setError(null);
    setPendingKey(editId);
    try {
      const note = editNote.trim() ? editNote.trim() : null;
      await onEdit({ id: editId, label, kind: editKind, note });
      cancelEdit();
    } catch (e: any) {
      setError(e?.message ?? "Nem sikerült frissíteni.");
    } finally {
      setPendingKey(null);
    }
  };

  const handleAdd = async (payload: {
    suggestion: HighlightSuggestion;
    kind: HighlightKind;
    note?: string | null;
  }) => {
    const { suggestion, kind, note } = payload;
    setError(null);
    setPendingKey(suggestion.suggestion_key);
    try {
      await onAdd({ suggestion, kind, note });
    } catch (e: any) {
      setError(e?.message ?? "Nem sikerült hozzáadni.");
      throw e;
    } finally {
      setPendingKey(null);
    }
  };

  const handleReject = async (s: HighlightSuggestion) => {
    setError(null);
    setPendingKey(`reject:${s.suggestion_key}`);
    try {
      await onReject(s.suggestion_key);
    } catch (e: any) {
      setError(e?.message ?? "Nem sikerült elutasítani.");
    } finally {
      setPendingKey(null);
    }
  };

  const commitSuggestion = async () => {
    if (!activeSuggestion) return;
    const note = modalNote.trim() ? modalNote.trim() : null;
    try {
      await handleAdd({ suggestion: activeSuggestion, kind: modalKind, note });
      setActiveSuggestion(null);
      setModalNote("");
    } catch {
      // handleAdd already sets error
    }
  };

  return (
    <GlassCardSurface className={styles.panel} variant="soft" paper="evening">
      <div className={styles.title}>Kiemelések</div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>Új elem</div>
        <div className={styles.customRow}>
          <input
            className={styles.input}
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Adj hozzá saját elemet…"
            aria-label="Új kiemelés"
          />
          <button
            type="button"
            className={styles.primaryButton}
            onClick={submitCustom}
            disabled={!customLabel.trim() || pendingKey === "custom"}
          >
            {pendingKey === "custom" ? "Mentés…" : "Mentés"}
          </button>
        </div>

        <div className={styles.kindRow}>
          {NON_DIRECTION_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              className={`${styles.kindPill} ${customKind === k.key ? styles.kindPillActive : ""}`}
              onClick={() => setCustomKind(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <input
          className={styles.input}
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder="Megjegyzés (opcionális)"
          aria-label="Megjegyzés"
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>Mentett elemek</div>
        {highlightRows.length === 0 ? (
          <div className={styles.emptyHint}>Még nincs kiemelés.</div>
        ) : (
          <div className={styles.savedPills}>
            {highlightRows.map((h) => (
              <div key={h.id} className={styles.savedPillRow}>
                {editId === h.id ? (
                  <div className={styles.editRow}>
                    <input
                      className={styles.input}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      aria-label="Kiemelés szerkesztése"
                      readOnly={!allowLabelEdit}
                      disabled={!allowLabelEdit}
                    />
                    <div className={styles.kindRow}>
                      {NON_DIRECTION_KINDS.map((k) => (
                        <button
                          key={k.key}
                          type="button"
                          className={`${styles.kindPill} ${editKind === k.key ? styles.kindPillActive : ""}`}
                          onClick={() => setEditKind(k.key)}
                        >
                          {k.label}
                        </button>
                      ))}
                    </div>
                    <input
                      className={styles.input}
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Megjegyzés (opcionális)"
                      aria-label="Megjegyzés szerkesztése"
                    />
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={cancelEdit}
                        disabled={pendingKey === h.id}
                      >
                        Mégse
                      </button>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={submitEdit}
                        disabled={pendingKey === h.id || !editLabel.trim()}
                      >
                        {pendingKey === h.id ? "Mentés…" : "Mentés"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.savedPill}
                    data-kind={normalizeKind(h.kind)}
                    onClick={() => beginEdit(h)}
                    title={`Szerkesztés: ${kindLabel(h.kind)}${h.note ? ` • ${h.note}` : ""}`}
                  >
                    {h.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>Javasolt elemek</div>
        {salientSuggestions.length === 0 ? (
          <div className={styles.emptyHint}>Nincs új javaslat.</div>
        ) : (
          <div className={styles.list}>
            {shownSalient.map((s) => (
              <div
                key={s.suggestion_key}
                className={`${styles.suggestionRow} ${styles.suggestionRowClickable}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (pendingKey) return;
                  const baseKind = normalizeKind(s.kind ?? "other");
                  const safeBaseKind = baseKind === "direction" ? "other" : baseKind;
                  setModalKind(safeBaseKind);
                  setModalNote("");
                  setActiveSuggestion(s);
                }}
                onKeyDown={(event) => {
                  if (pendingKey) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    const baseKind = normalizeKind(s.kind ?? "other");
                    const safeBaseKind = baseKind === "direction" ? "other" : baseKind;
                    setModalKind(safeBaseKind);
                    setModalNote("");
                    setActiveSuggestion(s);
                  }
                }}
              >
                <div className={styles.suggestionText}>
                  <div className={styles.listLabel}>{s.label}</div>
                  <div className={styles.listMeta}>{kindLabel(s.kind)}</div>
                </div>
                <div className={styles.suggestionActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleReject(s);
                    }}
                    disabled={pendingKey === `reject:${s.suggestion_key}`}
                  >
                    Elutasít
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      const baseKind = normalizeKind(s.kind ?? "other");
                      const safeBaseKind = baseKind === "direction" ? "other" : baseKind;
                      setModalKind(safeBaseKind);
                      setModalNote("");
                      setActiveSuggestion(s);
                    }}
                    disabled={pendingKey === s.suggestion_key}
                  >
                    {pendingKey === s.suggestion_key ? "Mentés…" : "Rögzítés"}
                  </button>
                </div>
              </div>
            ))}
            {hasMoreSalient ? (
              <div className={styles.showMoreRow}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowAllSuggestions((prev) => !prev)}
                >
                  {showAllSuggestions ? "Kevesebb javaslat" : "Több javaslat"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {activeSuggestion ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Ajánlott elem rögzítése"
          onClick={() => {
            if (pendingKey) return;
            setActiveSuggestion(null);
            setModalNote("");
          }}
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalTitle}>Rögzítés</div>
            <div className={styles.modalLabel}>{activeSuggestion.label}</div>
            <div className={styles.modalRow}>
              <span className={styles.modalHint}>Típus</span>
              <select
                className={styles.kindSelect}
                value={modalKind}
                onChange={(event) => {
                  const next = normalizeKind(event.target.value);
                  setModalKind(next === "direction" ? "other" : next);
                }}
              >
                {NON_DIRECTION_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              className={styles.input}
              value={modalNote}
              onChange={(event) => setModalNote(event.target.value)}
              placeholder="Megjegyzés (opcionális)"
              aria-label="Megjegyzés"
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  if (pendingKey) return;
                  setActiveSuggestion(null);
                  setModalNote("");
                }}
                disabled={Boolean(pendingKey)}
              >
                Mégse
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={commitSuggestion}
                disabled={Boolean(pendingKey)}
              >
                {pendingKey ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

    </GlassCardSurface>
  );
}
