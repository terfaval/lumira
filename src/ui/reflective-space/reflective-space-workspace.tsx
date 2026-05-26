"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Observation } from "@/src/domain/observation/types";
import type { OpeningSurface } from "@/src/domain/openings/types";
import type { ReflectiveObject, ReflectiveObjectType } from "@/src/domain/reflective-objects/types";
import type { ReflectiveResponseSurface } from "@/src/reflective-space/composition/derive-response-surfaces";
import type { ReflectiveThreadSurface } from "@/src/reflective-space/composition/derive-thread-surfaces";
import type { OpeningDialogue } from "@/src/reflective-space/composition/derive-opening-dialogues";
import type { ReflectiveGlossaryCue, ReflectiveSpaceViewportReadModel, ReflectiveSpaceViewportWindow } from "@/src/reflective-space/types";
import {
  filterOpeningSurfacesForCalmAvailability,
  isOpeningUtteranceVisible,
  toDialogueTracePhrasing,
  toDialogueWindowState,
} from "@/src/ui/reflective-space/view-model";

import styles from "@/src/ui/reflective-space/reflective-space-workspace.module.css";

const OBJECT_LIMIT = 8;
const DIALOGUE_LIMIT = 8;

interface ReflectiveSpaceViewportPayload {
  viewport: ReflectiveSpaceViewportReadModel;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

function shortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openingSurfaceLabel(surface: OpeningSurface): string {
  return surface.preview;
}

export function ReflectiveSpaceWorkspace() {
  const [summary, setSummary] = useState("Reflective space is loading.");
  const [reflectiveObjects, setReflectiveObjects] = useState<ReflectiveObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [threadSurfaces, setThreadSurfaces] = useState<ReflectiveThreadSurface[]>([]);
  const [responseSurfaces, setResponseSurfaces] = useState<ReflectiveResponseSurface[]>([]);
  const [openingSurfaces, setOpeningSurfaces] = useState<OpeningSurface[]>([]);
  const [dialogues, setDialogues] = useState<OpeningDialogue[]>([]);
  const [glossaryCues, setGlossaryCues] = useState<ReflectiveGlossaryCue[]>([]);
  const [dialogueWindow, setDialogueWindow] = useState<ReflectiveSpaceViewportWindow>(
    toDialogueWindowState({ limit: DIALOGUE_LIMIT, returned: 0, hasMore: false, nextBeforeCreatedAt: null }),
  );
  const [activatedUtterances, setActivatedUtterances] = useState<Record<string, string>>({});

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingMoreDialogues, setIsLoadingMoreDialogues] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [draftType, setDraftType] = useState<ReflectiveObjectType>("dream");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftResponseByOpening, setDraftResponseByOpening] = useState<Record<string, { title: string; responseText: string }>>({});

  const selectedObject = useMemo(
    () => reflectiveObjects.find((item) => item.id === selectedObjectId) ?? null,
    [reflectiveObjects, selectedObjectId],
  );

  const visibleOpenings = useMemo(() => filterOpeningSurfacesForCalmAvailability(openingSurfaces), [openingSurfaces]);

  const applyViewport = useCallback(
    (viewport: ReflectiveSpaceViewportReadModel, appendDialogues: boolean, requestedCenterObjectId?: string) => {
      setSummary(viewport.summary);
      setReflectiveObjects(viewport.sections.reflectiveObjects.items);
      setObservations(viewport.sections.observations.items);
      setThreadSurfaces(viewport.sections.threadSurfaces.items);
      setResponseSurfaces(viewport.sections.responseSurfaces.items);
      setOpeningSurfaces(viewport.sections.openingSurfaces.items);
      setGlossaryCues(viewport.continuity.glossaryCues);
      setDialogueWindow(viewport.windows.dialogueWindow);

      setSelectedObjectId(requestedCenterObjectId ?? viewport.centerObjectId);

      setDialogues((previous) => {
        if (!appendDialogues) {
          return viewport.sections.openingDialogues.items;
        }

        const seen = new Set(previous.map((dialogue) => dialogue.dialogueId));
        const unique = viewport.sections.openingDialogues.items.filter((dialogue) => !seen.has(dialogue.dialogueId));
        return [...previous, ...unique];
      });
    },
    [],
  );

  const loadViewport = useCallback(
    async (options?: { centerObjectId?: string; dialogueBefore?: string; dialogueCursor?: string; appendDialogues?: boolean }) => {
      const params = new URLSearchParams({
        objectLimit: String(OBJECT_LIMIT),
        dialogueLimit: String(DIALOGUE_LIMIT),
      });

      if (options?.centerObjectId) {
        params.set("centerObjectId", options.centerObjectId);
      }

      if (options?.dialogueBefore) {
        params.set("dialogueBefore", options.dialogueBefore);
      }

      if (options?.dialogueCursor) {
        params.set("dialogueCursor", options.dialogueCursor);
      }

      const payload = await requestJson<ReflectiveSpaceViewportPayload>(`/api/reflective-space/viewport?${params.toString()}`);
      applyViewport(payload.viewport, Boolean(options?.appendDialogues), options?.centerObjectId);
    },
    [applyViewport],
  );

  useEffect(() => {
    setIsBootstrapping(true);
    setErrorMessage(null);

    void loadViewport()
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Reflective space could not be loaded.");
      })
      .finally(() => setIsBootstrapping(false));
  }, [loadViewport]);

  async function handleCreateReflectiveObject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const payload = await requestJson<{ reflectiveObject: ReflectiveObject }>("/api/reflective-objects", {
        method: "POST",
        body: JSON.stringify({
          objectType: draftType,
          title: draftTitle,
          primaryContent: draftContent,
          sourceContext: "manual",
        }),
      });

      setDraftTitle("");
      setDraftContent("");
      await loadViewport({ centerObjectId: payload.reflectiveObject.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reflective object creation failed.");
    }
  }

  async function handleActivateOpening(openingId: string) {
    setErrorMessage(null);

    try {
      const payload = await requestJson<{ opening: { utterance: string } }>(`/api/openings/${openingId}/activate`, {
        method: "POST",
        body: JSON.stringify({ source: "reflective_space_surface" }),
      });

      setActivatedUtterances((previous) => ({
        ...previous,
        [openingId]: payload.opening.utterance,
      }));

      await loadViewport({ centerObjectId: selectedObjectId ?? undefined });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Opening activation failed.");
    }
  }

  async function handleSuppressOpening(openingId: string) {
    setErrorMessage(null);

    try {
      await requestJson(`/api/openings/${openingId}/suppress`, {
        method: "POST",
        body: JSON.stringify({
          nextState: "suppressed",
          duration: "temporary",
          suppressionReason: "quiet_for_now",
          suppressionExpiryMinutes: 1440,
          suppressionRevisitEligibility: "revisitable_dormant",
        }),
      });

      setActivatedUtterances((previous) => {
        const next = { ...previous };
        delete next[openingId];
        return next;
      });

      await loadViewport({ centerObjectId: selectedObjectId ?? undefined });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Opening suppression failed.");
    }
  }

  function updateOpeningResponseDraft(openingId: string, field: "title" | "responseText", value: string) {
    setDraftResponseByOpening((previous) => ({
      ...previous,
      [openingId]: {
        title: previous[openingId]?.title ?? "",
        responseText: previous[openingId]?.responseText ?? "",
        [field]: value,
      },
    }));
  }

  async function handleRespondToOpening(openingId: string) {
    const draft = draftResponseByOpening[openingId];

    if (!draft?.title.trim() || !draft.responseText.trim()) {
      setErrorMessage("Response title and text are required.");
      return;
    }

    setErrorMessage(null);

    try {
      await requestJson(`/api/openings/${openingId}/responses`, {
        method: "POST",
        body: JSON.stringify({
          title: draft.title,
          responseText: draft.responseText,
          openingActivationContext: "reflective_space_surface",
          openingResponseContext: "response_authored",
        }),
      });

      setDraftResponseByOpening((previous) => {
        const next = { ...previous };
        delete next[openingId];
        return next;
      });

      await loadViewport({ centerObjectId: selectedObjectId ?? undefined });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Response writing failed.");
    }
  }

  async function handleLoadEarlierDialogues() {
    if (!dialogueWindow.hasMore || (!dialogueWindow.nextBeforeCreatedAt && !dialogueWindow.nextCursor)) {
      return;
    }

    setIsLoadingMoreDialogues(true);
    setErrorMessage(null);

    try {
      await loadViewport({
        centerObjectId: selectedObjectId ?? undefined,
        dialogueBefore: dialogueWindow.nextBeforeCreatedAt ?? undefined,
        dialogueCursor: dialogueWindow.nextCursor ?? undefined,
        appendDialogues: true,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Dialogue revisitation loading failed.");
    } finally {
      setIsLoadingMoreDialogues(false);
    }
  }

  async function handleSelectObject(objectId: string) {
    setErrorMessage(null);

    try {
      await loadViewport({ centerObjectId: objectId });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reflective material loading failed.");
    }
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.hero}>
        <p className={styles.overline}>Reflective Space</p>
        <h1 className={styles.title}>A calm place to return to gently.</h1>
        <p className={styles.summary}>{summary}</p>
      </header>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>Reflective Material</h2>
          <form className={styles.form} onSubmit={handleCreateReflectiveObject}>
            <label>
              Type
              <select value={draftType} onChange={(event) => setDraftType(event.target.value as ReflectiveObjectType)}>
                <option value="dream">Dream</option>
                <option value="journal_entry">Journal entry</option>
                <option value="memory">Memory</option>
                <option value="reflective_note">Reflective note</option>
              </select>
            </label>
            <label>
              Title
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="A quiet title" />
            </label>
            <label>
              Material
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                rows={4}
                placeholder="Write reflective material when you choose to."
              />
            </label>
            <button type="submit">Save material</button>
          </form>

          <ul className={styles.list}>
            {reflectiveObjects.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === selectedObjectId ? styles.selectedItem : styles.listItem}
                  onClick={() => void handleSelectObject(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.objectType.replace("_", " ")}</span>
                </button>
              </li>
            ))}
          </ul>

          {selectedObject ? (
            <div className={styles.detailBlock}>
              <h3>{selectedObject.title}</h3>
              <p>{selectedObject.primaryContent}</p>
            </div>
          ) : isBootstrapping ? <p>Loading reflective material...</p> : <p>No reflective material yet.</p>}
        </article>

        <article className={styles.panel}>
          <h2>Observation Orientation</h2>
          {observations[0] ? (
            <>
              <p>{observations[0].summary}</p>
              <ul className={styles.inlineList}>
                {observations[0].fragments.slice(0, 5).map((fragment) => (
                  <li key={fragment.id}>
                    <strong>{fragment.category}</strong>
                    <span>{fragment.fragmentText}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No descriptive observations are available for this material yet.</p>
          )}
        </article>

        <article className={styles.panel}>
          <h2>Continuity Memory</h2>
          <h3>Glossary Cues</h3>
          <ul className={styles.inlineList}>
            {glossaryCues.slice(0, 6).map((cue, index) => (
              <li key={`${cue.category}-${cue.label}-${index}`}>
                <strong>{cue.label}</strong>
                <span>{cue.phrasing}</span>
              </li>
            ))}
          </ul>
          {glossaryCues.length === 0 ? <p>No glossary continuity cues yet.</p> : null}

          <h3>Threads</h3>
          <ul className={styles.inlineList}>
            {threadSurfaces.slice(0, 6).map((thread) => (
              <li key={thread.threadId}>
                <strong>{thread.title}</strong>
                <span>{thread.phrasing}</span>
              </li>
            ))}
          </ul>
          {threadSurfaces.length === 0 ? <p>No continuity threads yet.</p> : null}
        </article>

        <article className={styles.panel}>
          <h2>Optional Openings</h2>
          <p className={styles.quietNote}>Openings stay quiet until you choose to open one.</p>
          <ul className={styles.inlineList}>
            {visibleOpenings.map((surface) => {
              const openingId = surface.openingId;
              const openingVisible = isOpeningUtteranceVisible(openingId, activatedUtterances);
              const draft = draftResponseByOpening[openingId] ?? { title: "", responseText: "" };

              return (
                <li key={openingId} className={styles.openingCard}>
                  <strong>{openingSurfaceLabel(surface)}</strong>
                  <span>{surface.tone} tone</span>
                  {!openingVisible ? (
                    <button type="button" onClick={() => void handleActivateOpening(openingId)}>
                      Open quietly
                    </button>
                  ) : (
                    <div className={styles.openingBody}>
                      <p>{activatedUtterances[openingId]}</p>
                      <label>
                        Response title (optional to fill now)
                        <input
                          value={draft.title}
                          onChange={(event) => updateOpeningResponseDraft(openingId, "title", event.target.value)}
                          placeholder="A gentle response title"
                        />
                      </label>
                      <label>
                        Reflective response (optional)
                        <textarea
                          value={draft.responseText}
                          onChange={(event) => updateOpeningResponseDraft(openingId, "responseText", event.target.value)}
                          rows={3}
                          placeholder="You may respond now, later, or not at all."
                        />
                      </label>
                      <div className={styles.rowActions}>
                        <button type="button" onClick={() => void handleRespondToOpening(openingId)}>
                          Save response
                        </button>
                        <button type="button" className={styles.ghostAction} onClick={() => void handleSuppressOpening(openingId)}>
                          Keep quiet for now
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {visibleOpenings.length === 0 ? <p>Silence is currently available. No opening needs to surface now.</p> : null}
        </article>

        <article className={styles.panelWide}>
          <h2>Revisitable Dialogue Traces</h2>
          <p className={styles.quietNote}>This is a bounded archive window, not an endless conversation feed.</p>
          <ul className={styles.inlineList}>
            {dialogues.map((dialogue) => (
              <li key={dialogue.dialogueId} className={styles.dialogueCard}>
                <header>
                  <strong>{dialogue.entry.opening.openingType.replace("_", " ")}</strong>
                  <span>{shortDate(dialogue.lineage.activationAt)}</span>
                </header>
                <p>{dialogue.entry.opening.utterance}</p>
                <p className={styles.dialogueStatus}>{toDialogueTracePhrasing(dialogue)}</p>
                {dialogue.entry.response ? (
                  <blockquote>
                    <strong>{dialogue.entry.response.title}</strong>
                    <p>{dialogue.entry.response.responseText}</p>
                  </blockquote>
                ) : null}
                <footer>
                  <span>objects: {dialogue.context.reflectiveObjectIds.length}</span>
                  <span>threads: {dialogue.context.threadIds.length}</span>
                </footer>
              </li>
            ))}
          </ul>
          {dialogues.length === 0 ? <p>No dialogue traces yet. Activation without response remains fully valid.</p> : null}

          {dialogueWindow.hasMore && (dialogueWindow.nextBeforeCreatedAt || dialogueWindow.nextCursor) ? (
            <button
              type="button"
              onClick={() => void handleLoadEarlierDialogues()}
              disabled={isLoadingMoreDialogues}
            >
              {isLoadingMoreDialogues ? "Loading earlier traces..." : "Load earlier traces"}
            </button>
          ) : null}
        </article>

        <article className={styles.panel}>
          <h2>Revisitable Responses</h2>
          <ul className={styles.inlineList}>
            {responseSurfaces.slice(0, 8).map((response) => (
              <li key={response.responseId}>
                <strong>{response.title}</strong>
                <span>{response.phrasing}</span>
              </li>
            ))}
          </ul>
          {responseSurfaces.length === 0 ? <p>No reflective responses yet.</p> : null}
        </article>
      </section>
    </div>
  );
}
