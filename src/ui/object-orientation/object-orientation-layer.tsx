"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, GitBranch, Plus, X } from "lucide-react";

import type { GlossaryEntityType } from "@/src/domain/glossary/types";
import type { ObjectOrientationPayload } from "@/src/reflective-space/composition/compose-object-orientation-payload";
import {
  filterGlossaryPanelItems,
  filterOrientationOpenings,
  glossaryPrimaryActionLabel,
  orderGlossaryPanelItems,
  type GlossaryPanelFilter,
  type GlossaryPanelItem,
  type OrientationStackView,
} from "@/src/ui/object-orientation/view-model";

import styles from "@/src/ui/object-orientation/object-orientation-layer.module.css";

interface ObjectOrientationLayerProps {
  payload: ObjectOrientationPayload;
}

const OPENING_HOVER_DELAY_MS = 320;

const STACK_TABS: Array<{ key: Exclude<OrientationStackView, "dormant">; label: string }> = [
  { key: "new", label: "Új" },
  { key: "active", label: "Aktív" },
  { key: "all", label: "Mind" },
];

const GLOSSARY_FILTERS: Array<{ key: GlossaryPanelFilter; label: string }> = [
  { key: "all", label: "Mind" },
  { key: "pending", label: "Függőben" },
  { key: "matches", label: "Egyező" },
  { key: "ambiguous", label: "Többértelmű" },
  { key: "new", label: "Új" },
  { key: "saved", label: "Rögzített" },
];

const ENTITY_TYPE_OPTIONS: Array<{ value: GlossaryEntityType; label: string }> = [
  { value: "person", label: "Személy" },
  { value: "place", label: "Hely" },
  { value: "object", label: "Tárgy" },
  { value: "role", label: "Szerep" },
  { value: "concept", label: "Fogalom" },
  { value: "animal_or_creature", label: "Állat vagy lény" },
  { value: "setting_or_space", label: "Tér vagy közeg" },
];

interface GlossaryModalState {
  item: Extract<GlossaryPanelItem, { kind: "candidate" }>;
  selectedEntityId: string | "new" | null;
  canonicalLabel: string;
  labelDraft: string;
  isEditingLabel: boolean;
  labelFeedback: string | null;
  entityType: GlossaryEntityType;
  generalNote: string;
  appearanceNote: string;
}

function toStateLabel(view: OrientationStackView): string {
  switch (view) {
    case "new":
      return "Új";
    case "active":
      return "Aktív";
    case "dormant":
      return "Szunnyadó";
    default:
      return "Mind";
  }
}

function toEntityTypeLabel(type: GlossaryEntityType): string {
  return ENTITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Fogalom";
}

function toTypeClass(type: GlossaryEntityType): string {
  switch (type) {
    case "person":
      return styles.typePerson;
    case "place":
    case "setting_or_space":
      return styles.typePlace;
    case "object":
    case "animal_or_creature":
      return styles.typeObject;
    case "role":
      return styles.typeRole;
    default:
      return styles.typeConcept;
  }
}

function toStatusClass(status: GlossaryPanelItem["status"]): string {
  switch (status) {
    case "match":
      return styles.statusMatch;
    case "ambiguous":
      return styles.statusAmbiguous;
    case "new":
      return styles.statusNew;
    default:
      return styles.statusSaved;
  }
}

function toPrimaryActionLabel(item: Extract<GlossaryPanelItem, { kind: "candidate" }>): string {
  return glossaryPrimaryActionLabel(item.candidateClass);
}

function toPrimaryActionTooltip(item: Extract<GlossaryPanelItem, { kind: "candidate" }>): string {
  switch (item.candidateClass) {
    case "match_candidate":
      return "Megerősítés";
    case "ambiguous_match_candidate":
      return "Feloldás több lehetőség közül";
    default:
      return "Új entitás létrehozása";
  }
}

function toPrimaryActionIcon(item: Extract<GlossaryPanelItem, { kind: "candidate" }>) {
  switch (item.candidateClass) {
    case "match_candidate":
      return Check;
    case "ambiguous_match_candidate":
      return GitBranch;
    default:
      return Plus;
  }
}

function toContinuityVisibilityCopy(item: GlossaryPanelItem): string | null {
  if (item.kind !== "candidate" || !item.continuityVisibility?.possibleContinuity) {
    return null;
  }

  return `LehetsĂ©ges folytonossĂˇg • ${item.continuityVisibility.dreamCount} Ăˇlomban`;
}

function buildInitialModalState(item: Extract<GlossaryPanelItem, { kind: "candidate" }>): GlossaryModalState {
  return {
    item,
    selectedEntityId: item.candidateClass === "match_candidate" ? item.proposedEntities[0]?.id ?? null : null,
    canonicalLabel: item.candidateClass === "match_candidate" ? item.proposedEntities[0]?.canonicalLabel ?? item.label : item.label,
    labelDraft: item.candidateClass === "match_candidate" ? item.proposedEntities[0]?.canonicalLabel ?? item.label : item.label,
    isEditingLabel: false,
    labelFeedback: null,
    entityType: item.candidateClass === "match_candidate" ? item.proposedEntities[0]?.type ?? item.entityType : item.entityType,
    generalNote: "",
    appearanceNote: "",
  };
}

function getSelectedProposedEntity(
  item: Extract<GlossaryPanelItem, { kind: "candidate" }>,
  selectedEntityId: GlossaryModalState["selectedEntityId"],
) {
  if (selectedEntityId && selectedEntityId !== "new") {
    return item.proposedEntities.find((entity) => entity.id === selectedEntityId) ?? null;
  }

  return item.proposedEntities[0] ?? null;
}

function toSavedItem(term: {
  id: string;
  canonicalLabel: string;
  type: GlossaryEntityType;
}): Extract<GlossaryPanelItem, { kind: "saved" }> {
  return {
    id: `saved-${term.id}`,
    kind: "saved",
    label: term.canonicalLabel,
    canonicalLabel: term.canonicalLabel,
    entityType: term.type,
    sourceCategory: "saved_entity",
    recurrenceCount: null,
    status: "saved",
    proposedEntities: [],
    href: null,
  };
}

export function ObjectOrientationLayer({ payload }: ObjectOrientationLayerProps) {
  const [selectedView, setSelectedView] = useState<OrientationStackView>(payload.openingStack.defaultView);
  const [glossaryFilter, setGlossaryFilter] = useState<GlossaryPanelFilter>("all");
  const [glossaryItems, setGlossaryItems] = useState<GlossaryPanelItem[]>(payload.glossary.items);
  const [modalState, setModalState] = useState<GlossaryModalState | null>(null);
  const [pendingGlossaryId, setPendingGlossaryId] = useState<string | null>(null);
  const [glossaryFeedback, setGlossaryFeedback] = useState<string | null>(null);
  const [pendingOpeningId, setPendingOpeningId] = useState<string | null>(null);
  const [expandedOpeningId, setExpandedOpeningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dreamTitle, setDreamTitle] = useState(payload.dream.title);
  const [titleDraft, setTitleDraft] = useState(payload.dream.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleFeedback, setTitleFeedback] = useState<string | null>(null);
  const [isSavingTitle, startSavingTitle] = useTransition();
  const [isSavingGlossaryLabel, startSavingGlossaryLabel] = useTransition();
  const openingHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleOpenings = filterOrientationOpenings(payload.openingStack.items, selectedView);
  const orderedGlossaryItems = useMemo(() => orderGlossaryPanelItems(glossaryItems), [glossaryItems]);
  const visibleGlossaryItems = useMemo(
    () => filterGlossaryPanelItems(orderedGlossaryItems, glossaryFilter),
    [glossaryFilter, orderedGlossaryItems],
  );

  useEffect(() => {
    setDreamTitle(payload.dream.title);
    setTitleDraft(payload.dream.title);
    setIsEditingTitle(false);
    setTitleFeedback(null);
  }, [payload.dream.title]);

  useEffect(() => {
    setGlossaryItems(payload.glossary.items);
    setGlossaryFilter("all");
    setModalState(null);
    setGlossaryFeedback(null);
  }, [payload.glossary.items]);

  useEffect(() => {
    return () => {
      if (openingHoverTimeoutRef.current !== null) {
        clearTimeout(openingHoverTimeoutRef.current);
      }
    };
  }, []);

  function clearOpeningHoverTimeout() {
    if (openingHoverTimeoutRef.current !== null) {
      clearTimeout(openingHoverTimeoutRef.current);
      openingHoverTimeoutRef.current = null;
    }
  }

  function scheduleOpeningExpansion(openingId: string) {
    clearOpeningHoverTimeout();
    openingHoverTimeoutRef.current = setTimeout(() => {
      setExpandedOpeningId(openingId);
      openingHoverTimeoutRef.current = null;
    }, OPENING_HOVER_DELAY_MS);
  }

  function collapseOpening(openingId: string) {
    clearOpeningHoverTimeout();
    setExpandedOpeningId((current) => (current === openingId ? null : current));
  }

  async function handleEnterOpening(openingId: string) {
    setPendingOpeningId(openingId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/openings/${openingId}/select`, {
        method: "POST",
      });
      const body = (await response.json()) as { error?: string; href?: string };

      if (!response.ok || !body.href) {
        throw new Error(body.error ?? "This opening could not be entered yet.");
      }

      window.location.assign(body.href);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "This opening could not be entered yet.");
      setPendingOpeningId(null);
    }
  }

  function handleStartTitleEdit() {
    setTitleDraft(dreamTitle);
    setTitleFeedback(null);
    setIsEditingTitle(true);
  }

  function handleCancelTitleEdit() {
    setTitleDraft(dreamTitle);
    setTitleFeedback(null);
    setIsEditingTitle(false);
  }

  async function handleSaveTitle() {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleFeedback("Adj egy rövid címet az álomnak.");
      return;
    }

    setTitleFeedback(null);
    startSavingTitle(async () => {
      try {
        const response = await fetch(`/api/reflective-objects/${payload.dream.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        });

        const body = (await response.json()) as { error?: string; reflectiveObject?: { title?: string } };
        if (!response.ok) {
          throw new Error(body.error ?? "A cím mentése nem sikerült.");
        }

        const savedTitle = body.reflectiveObject?.title?.trim() || nextTitle;
        setDreamTitle(savedTitle);
        setTitleDraft(savedTitle);
        setIsEditingTitle(false);
      } catch (error) {
        setTitleFeedback(error instanceof Error ? error.message : "A cím mentése nem sikerült.");
      }
    });
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelTitleEdit();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void handleSaveTitle();
    }
  }

  function openCandidateModal(item: Extract<GlossaryPanelItem, { kind: "candidate" }>) {
    setGlossaryFeedback(null);
    setModalState(buildInitialModalState(item));
  }

  function handleStartGlossaryLabelEdit() {
    setGlossaryFeedback(null);
    setModalState((current) =>
      current
        ? {
            ...current,
            isEditingLabel: true,
            labelDraft: current.canonicalLabel,
            labelFeedback: null,
          }
        : current,
    );
  }

  function handleCancelGlossaryLabelEdit() {
    setModalState((current) =>
      current
        ? {
            ...current,
            isEditingLabel: false,
            labelDraft: current.canonicalLabel,
            labelFeedback: null,
          }
        : current,
    );
  }

  async function handleSaveGlossaryLabel() {
    if (!modalState) {
      return;
    }

    const nextLabel = modalState.labelDraft.trim();
    if (!nextLabel) {
      setModalState((current) =>
        current
          ? {
              ...current,
              labelFeedback: "Adj nevet a szótári entitásnak.",
            }
          : current,
      );
      return;
    }

    const selectedEntity =
      modalState.selectedEntityId && modalState.selectedEntityId !== "new"
        ? getSelectedProposedEntity(modalState.item, modalState.selectedEntityId)
        : modalState.item.candidateClass === "match_candidate"
          ? getSelectedProposedEntity(modalState.item, modalState.selectedEntityId)
          : null;

    if (!selectedEntity) {
      setModalState((current) =>
        current
          ? {
              ...current,
              canonicalLabel: nextLabel,
              labelDraft: nextLabel,
              isEditingLabel: false,
              labelFeedback: null,
            }
          : current,
      );
      return;
    }

    setGlossaryFeedback(null);
    startSavingGlossaryLabel(async () => {
      try {
        const response = await fetch(`/api/glossary/terms/${selectedEntity.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            canonicalLabel: nextLabel,
            type: selectedEntity.type,
            generalNote: selectedEntity.generalNote ?? null,
          }),
        });

        const body = (await response.json()) as {
          error?: string;
          term?: { id: string; canonicalLabel: string; type: GlossaryEntityType; generalNote?: string | null };
        };

        if (!response.ok || !body.term) {
          throw new Error(body.error ?? "A név mentése nem sikerült.");
        }

        const savedTerm = body.term;
        const savedLabel = savedTerm.canonicalLabel.trim() || nextLabel;

        setGlossaryItems((current) =>
          current.map((entry) => {
            if (entry.kind === "saved" && entry.id === `saved-${savedTerm.id}`) {
              return {
                ...entry,
                label: savedLabel,
                canonicalLabel: savedLabel,
                entityType: savedTerm.type,
              };
            }

            if (entry.kind === "candidate") {
              return {
                ...entry,
                proposedEntities: entry.proposedEntities.map((entity) =>
                  entity.id === savedTerm.id
                    ? {
                        ...entity,
                        canonicalLabel: savedLabel,
                        type: savedTerm.type,
                        generalNote: savedTerm.generalNote ?? entity.generalNote,
                      }
                    : entity,
                ),
              };
            }

            return entry;
          }),
        );

        setModalState((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            item: {
              ...current.item,
              proposedEntities: current.item.proposedEntities.map((entity) =>
                entity.id === savedTerm.id
                  ? {
                      ...entity,
                      canonicalLabel: savedLabel,
                      type: savedTerm.type,
                      generalNote: savedTerm.generalNote ?? entity.generalNote,
                    }
                  : entity,
              ),
            },
            canonicalLabel: savedLabel,
            labelDraft: savedLabel,
            isEditingLabel: false,
            labelFeedback: null,
            entityType: savedTerm.type,
          };
        });
      } catch (error) {
        setModalState((current) =>
          current
            ? {
                ...current,
                labelFeedback: error instanceof Error ? error.message : "A név mentése nem sikerült.",
              }
            : current,
        );
      }
    });
  }

  function handleGlossaryLabelKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelGlossaryLabelEdit();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void handleSaveGlossaryLabel();
    }
  }

  async function handleDismissCandidate(item: Extract<GlossaryPanelItem, { kind: "candidate" }>) {
    setPendingGlossaryId(item.id);
    setGlossaryFeedback(null);

    try {
      const response = await fetch(`/api/glossary/candidates/${item.candidateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nextState: "ignored" }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "A jelölt most nem zárható le.");
      }

      setGlossaryItems((current) => current.filter((entry) => entry.id !== item.id));
      if (modalState?.item.id === item.id) {
        setModalState(null);
      }
    } catch (error) {
      setGlossaryFeedback(error instanceof Error ? error.message : "A jelölt most nem zárható le.");
    } finally {
      setPendingGlossaryId(null);
    }
  }

  async function handleResolveCandidate() {
    if (!modalState) {
      return;
    }

    const { item } = modalState;
    const canonicalLabel = modalState.canonicalLabel.trim();
    const selectedEntity = getSelectedProposedEntity(item, modalState.selectedEntityId);
    let payloadBody: Record<string, unknown>;

    if (item.candidateClass === "match_candidate") {
      const entityId = modalState.selectedEntityId ?? item.proposedEntities[0]?.id;
      if (!entityId || entityId === "new") {
        setGlossaryFeedback("Ehhez a megerősítéshez hiányzik a meglévő entitás.");
        return;
      }

      payloadBody = {
        resolutionType: "confirm_existing_entity",
        entityId,
        canonicalLabel:
          canonicalLabel && selectedEntity && canonicalLabel !== selectedEntity.canonicalLabel ? canonicalLabel : undefined,
        appearanceNote: modalState.appearanceNote.trim() || null,
      };
    } else if (item.candidateClass === "ambiguous_match_candidate" && modalState.selectedEntityId && modalState.selectedEntityId !== "new") {
      payloadBody = {
        resolutionType: "select_existing_entity",
        entityId: modalState.selectedEntityId,
        canonicalLabel:
          canonicalLabel && selectedEntity && canonicalLabel !== selectedEntity.canonicalLabel ? canonicalLabel : undefined,
        appearanceNote: modalState.appearanceNote.trim() || null,
      };
    } else {
      if (!canonicalLabel) {
        setGlossaryFeedback("Adj meg egy címkét az új entitáshoz.");
        return;
      }

      payloadBody = {
        resolutionType: "create_new_entity",
        canonicalLabel,
        type: modalState.entityType,
        generalNote: modalState.generalNote.trim() || null,
        appearanceNote: modalState.appearanceNote.trim() || null,
      };
    }

    setPendingGlossaryId(item.id);
    setGlossaryFeedback(null);

    try {
      const response = await fetch(`/api/glossary/candidates/${item.candidateId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const body = (await response.json()) as {
        error?: string;
        term?: { id: string; canonicalLabel: string; type: GlossaryEntityType };
      };
      if (!response.ok || !body.term) {
        throw new Error(body.error ?? "A feloldás most nem sikerült.");
      }

      const resolvedTerm = body.term;

      setGlossaryItems((current) => {
        const next = current.filter((entry) => entry.id !== item.id);
        const savedItem = toSavedItem(resolvedTerm);
        if (next.some((entry) => entry.kind === "saved" && entry.canonicalLabel === savedItem.canonicalLabel)) {
          return next;
        }

        return [...next, savedItem];
      });
      setModalState(null);
    } catch (error) {
      setGlossaryFeedback(error instanceof Error ? error.message : "A feloldás most nem sikerült.");
    } finally {
      setPendingGlossaryId(null);
    }
  }

  function renderExistingEntitySummary(item: Extract<GlossaryPanelItem, { kind: "candidate" }>) {
    const selectedEntity = modalState ? getSelectedProposedEntity(item, modalState.selectedEntityId) : null;

    if (!selectedEntity) {
      return null;
    }

    return (
      <div className={styles.modalSection}>
        <p className={styles.modalSectionLabel}>Meglévő entitás</p>
        <dl className={styles.entityMetaList}>
          <div>
            <dt>Név</dt>
            <dd>{selectedEntity.canonicalLabel}</dd>
          </div>
          <div>
            <dt>Típus</dt>
            <dd>{toEntityTypeLabel(selectedEntity.type)}</dd>
          </div>
          <div>
            <dt>Előfordulások</dt>
            <dd>{selectedEntity.appearanceCount}</dd>
          </div>
          {selectedEntity.generalNote ? (
            <div>
              <dt>Általános jegyzet</dt>
              <dd>{selectedEntity.generalNote}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.layout}>
        <section className={styles.topRow}>
          <article className={styles.dreamSurface}>
            <div className={styles.dreamFrame}>
              <div className={styles.dreamHeader}>
                <div className={styles.panelTitleBlock}>
                  {isEditingTitle ? (
                    <>
                      <input
                        aria-label="Álom címének szerkesztése"
                        className={styles.titleInput}
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        autoFocus
                        maxLength={80}
                      />
                      {titleFeedback ? <p className={styles.titleFeedback}>{titleFeedback}</p> : null}
                    </>
                  ) : (
                    <h1>{dreamTitle}</h1>
                  )}
                </div>

                <div className={styles.titleActions}>
                  {isEditingTitle ? (
                    <>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Cím mentése"
                        onClick={() => void handleSaveTitle()}
                        disabled={isSavingTitle}
                      >
                        <span aria-hidden="true">✓</span>
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Cím szerkesztésének megszakítása"
                        onClick={handleCancelTitleEdit}
                        disabled={isSavingTitle}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Cím szerkesztése"
                      onClick={handleStartTitleEdit}
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.dreamBody}>
                <p className={styles.dreamText}>{payload.dream.preview}</p>
              </div>
            </div>
          </article>

          <div className={styles.signalColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <p className={styles.panelLabel}>Jelzések</p>
              </div>
              <p className={styles.placeholderText}>Hamarosan.</p>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <p className={styles.panelLabel}>Érzelmi tér</p>
              </div>
              <p className={styles.placeholderText}>Hamarosan.</p>
            </section>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Álomszótár</p>
            </div>
            {glossaryFeedback ? <p className={styles.feedback}>{glossaryFeedback}</p> : null}
            {visibleGlossaryItems.length > 0 ? (
              <div className={styles.glossaryListViewport}>
                <ul className={styles.glossaryList}>
                {visibleGlossaryItems.map((item) => {
                  const isPending = pendingGlossaryId === item.id;

                  return (
                    <li key={item.id} className={`${styles.glossaryRow} ${toTypeClass(item.entityType)}`}>
                      <span className={`${styles.typeIndicator} ${toStatusClass(item.status)}`} aria-hidden="true" />
                      <span className={styles.glossaryRowCopy}>
                        <span className={styles.glossaryRowLabel}>{item.label}</span>
                        {toContinuityVisibilityCopy(item) ? (
                          <span className={styles.glossaryRowMeta}>{toContinuityVisibilityCopy(item)}</span>
                        ) : null}
                      </span>
                      <div className={styles.glossaryRowActions}>
                        {item.kind === "candidate" ? (
                          <>
                            <button
                              type="button"
                              className={styles.rowIconButton}
                              onClick={() => openCandidateModal(item)}
                              title={toPrimaryActionTooltip(item)}
                              aria-label={toPrimaryActionTooltip(item)}
                              disabled={isPending}
                            >
                              {(() => {
                                const Icon = toPrimaryActionIcon(item);
                                return <Icon size={16} strokeWidth={2} aria-hidden="true" />;
                              })()}
                            </button>
                            <button
                              type="button"
                              className={styles.rowIconButton}
                              onClick={() => void handleDismissCandidate(item)}
                              title="Lezárás most nélkül"
                              aria-label="Lezárás most nélkül"
                              disabled={isPending}
                            >
                              <X size={16} strokeWidth={2} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className={styles.rowIconButton}
                            title={item.href ? "Részletes nézet megnyitása" : "Még nincs stabil részletes nézet"}
                            aria-label={item.href ? "Részletes nézet megnyitása" : "Még nincs stabil részletes nézet"}
                            disabled={!item.href}
                            onClick={() => {
                              if (item.href) {
                                window.location.assign(item.href);
                              }
                            }}
                          >
                            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            ) : (
              <p className={styles.emptyState}>Ebben a szűrőben nincs megjeleníthető tétel.</p>
            )}

            <div className={styles.filterBlock}>
              <p className={styles.filterLabel}>Szűrő</p>
              <select
                className={styles.filterSelect}
                aria-label="Szótárszűrő"
                value={glossaryFilter}
                onChange={(event) => setGlossaryFilter(event.target.value as GlossaryPanelFilter)}
              >
                {GLOSSARY_FILTERS.map((filter) => (
                  <option key={filter.key} value={filter.key}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </section>
        </section>

        <section className={styles.bottomRow}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Szálak</p>
            </div>
            <ul className={styles.stateList}>
              {payload.threadOverview.map((item) => {
                const active = selectedView === item.state;

                return (
                  <li key={item.state}>
                    <button
                      type="button"
                      className={`${styles.stateButton} ${active ? styles.stateButtonActive : ""}`}
                      onClick={() => setSelectedView(item.state)}
                    >
                      <span className={styles.stateCopy}>
                        <strong>{toStateLabel(item.state)}</strong>
                      </span>
                      <span className={styles.countBadge}>{item.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.panel}>
            <div className={styles.stackHeader}>
              <p className={styles.panelLabel}>Megnyitások</p>
              <ul className={styles.tabList}>
                {STACK_TABS.map((tab) => (
                  <li key={tab.key}>
                    <button
                      type="button"
                      className={`${styles.tabButton} ${selectedView === tab.key ? styles.tabButtonActive : ""}`}
                      aria-pressed={selectedView === tab.key}
                      onClick={() => setSelectedView(tab.key)}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

{visibleOpenings.length > 0 ? (
              <ul className={styles.openingList}>
                {visibleOpenings.map((item) => (
                  <li
                    key={item.id}
                    className={`${styles.openingCard} ${expandedOpeningId === item.id ? styles.openingCardExpanded : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.openingCardButton}
                      disabled={pendingOpeningId === item.id}
                      aria-expanded={expandedOpeningId === item.id}
                      onMouseEnter={() => scheduleOpeningExpansion(item.id)}
                      onMouseLeave={() => collapseOpening(item.id)}
                      onFocus={() => {
                        clearOpeningHoverTimeout();
                        setExpandedOpeningId(item.id);
                      }}
                      onBlur={() => collapseOpening(item.id)}
                      onClick={() => void handleEnterOpening(item.id)}
                    >
                      <strong className={styles.openingQuestion}>
                        {pendingOpeningId === item.id ? "Előkészítés..." : item.title}
                      </strong>
                      <span className={styles.openingContext} aria-hidden={expandedOpeningId !== item.id}>
                        {item.context}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>
                {selectedView === "dormant" ? "Nincs szunnyadó megnyitás." : "Ebben a nézetben nincs megnyitás."}
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Jegyzetek</p>
            </div>
            <p className={styles.placeholderText}>Hamarosan.</p>
          </section>
        </section>
      </div>

      {modalState ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setModalState(null)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="orientation-glossary-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                {modalState.isEditingLabel ? (
                  <>
                    <input
                      id="orientation-glossary-title"
                      aria-label="Szótári entitás nevének szerkesztése"
                      className={styles.titleInput}
                      value={modalState.labelDraft}
                      onChange={(event) =>
                        setModalState((current) =>
                          current ? { ...current, labelDraft: event.target.value, labelFeedback: null } : current,
                        )
                      }
                      onKeyDown={handleGlossaryLabelKeyDown}
                      autoFocus
                      maxLength={80}
                    />
                    {modalState.labelFeedback ? <p className={styles.titleFeedback}>{modalState.labelFeedback}</p> : null}
                  </>
                ) : (
                  <h3 id="orientation-glossary-title">{modalState.canonicalLabel}</h3>
                )}
                <p className={styles.modalType}>{toEntityTypeLabel(modalState.entityType)}</p>
              </div>
              <div className={styles.titleActions}>
                {modalState.isEditingLabel ? (
                  <>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Név mentése"
                      onClick={() => void handleSaveGlossaryLabel()}
                      disabled={isSavingGlossaryLabel}
                    >
                      <span aria-hidden="true">✓</span>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Névszerkesztés megszakítása"
                      onClick={handleCancelGlossaryLabelEdit}
                      disabled={isSavingGlossaryLabel}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Név szerkesztése"
                    onClick={handleStartGlossaryLabelEdit}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                )}
                <button
                type="button"
                className={styles.rowIconButton}
                aria-label="Bezárás"
                onClick={() => setModalState(null)}
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              </div>
            </div>

            {modalState.item.candidateClass === "ambiguous_match_candidate" ? (
              <div className={styles.modalSection}>
                <p className={styles.modalSectionLabel}>Meglévő entitás</p>
                <div className={styles.selectionList}>
                  {modalState.item.proposedEntities.map((entity) => (
                    <label key={entity.id} className={styles.selectionOption}>
                      <input
                        type="radio"
                        name="glossary-resolution"
                        checked={modalState.selectedEntityId === entity.id}
                        onChange={() =>
                          setModalState((current) =>
                            current
                              ? {
                                  ...current,
                                  selectedEntityId: entity.id,
                                  canonicalLabel: entity.canonicalLabel,
                                  labelDraft: entity.canonicalLabel,
                                  isEditingLabel: false,
                                  labelFeedback: null,
                                  entityType: entity.type,
                                }
                              : current,
                          )
                        }
                      />
                      <span>
                        <strong>{entity.canonicalLabel}</strong>
                        <span>{toEntityTypeLabel(entity.type)}</span>
                      </span>
                    </label>
                  ))}
                  <label className={styles.selectionOption}>
                    <input
                      type="radio"
                      name="glossary-resolution"
                      checked={modalState.selectedEntityId === "new"}
                      onChange={() =>
                        setModalState((current) =>
                          current
                            ? {
                                ...current,
                                selectedEntityId: "new",
                                canonicalLabel: current.item.label,
                                labelDraft: current.item.label,
                                isEditingLabel: false,
                                labelFeedback: null,
                                entityType: current.item.entityType,
                              }
                            : current,
                        )
                      }
                    />
                    <span>
                      <strong>Új létrehozása</strong>
                      <span>Új entitás létrehozása ebből a jelöltből.</span>
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            {modalState.item.candidateClass !== "new_candidate" &&
            modalState.item.candidateClass !== "ambiguous_match_candidate"
              ? renderExistingEntitySummary(modalState.item)
              : null}
            {modalState.item.candidateClass === "ambiguous_match_candidate" && modalState.selectedEntityId && modalState.selectedEntityId !== "new"
              ? renderExistingEntitySummary(modalState.item)
              : null}

            {(modalState.item.candidateClass === "new_candidate" || modalState.selectedEntityId === "new") ? (
              <div className={styles.modalSection}>
                <label className={styles.fieldLabel}>
                  <span>Típus</span>
                  <select
                    className={styles.fieldSelect}
                    value={modalState.entityType}
                    onChange={(event) =>
                      setModalState((current) =>
                        current ? { ...current, entityType: event.target.value as GlossaryEntityType } : current,
                      )
                    }
                  >
                    {ENTITY_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.fieldLabel}>
                  <span>Általános jegyzet</span>
                  <textarea
                    className={styles.textArea}
                    rows={3}
                    value={modalState.generalNote}
                    onChange={(event) =>
                      setModalState((current) => (current ? { ...current, generalNote: event.target.value } : current))
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className={styles.modalSection}>
              <label className={styles.fieldLabel}>
                <span>Ehhez az előforduláshoz</span>
                <textarea
                  className={styles.textArea}
                  rows={4}
                  value={modalState.appearanceNote}
                  onChange={(event) =>
                    setModalState((current) => (current ? { ...current, appearanceNote: event.target.value } : current))
                  }
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalPrimaryAction}
                onClick={() => void handleResolveCandidate()}
                disabled={pendingGlossaryId === modalState.item.id}
              >
                {pendingGlossaryId === modalState.item.id ? "Mentés..." : toPrimaryActionLabel(modalState.item)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
