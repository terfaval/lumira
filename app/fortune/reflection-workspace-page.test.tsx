import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getMajorArcanaDeck, getTarotModeById, getTarotModes } from "@/src/content/fortune-journaling";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import type { FortuneSession } from "@/src/domain/fortune-sessions/types";
import FortuneJournalingPageClient from "@/src/features/fortune-journaling/FortuneJournalingPageClient";

function renderReflectionWorkspace(input: {
  focusText?: string | null;
  sessionState?: FortuneSession["state"];
  turns?: FortuneSessionTurn[];
  modeId?: string;
}) {
  const mode = getTarotModeById(input.modeId ?? "timeline");
  const deck = getMajorArcanaDeck();
  const session: FortuneSession = {
    id: "fortune-1",
    userId: "user-1",
    modeId: mode.id,
    focusText: input.focusText ?? null,
    cardSelections: mode.positions.map((position, index) => ({
      positionKey: position.key,
      cardId: deck[index]!.id,
    })),
    firstInterpretation: "Először a két szélső lap közti húzás tűnt fel.",
    state: input.sessionState ?? "active",
    pausedAt: input.sessionState === "paused" ? "2026-08-24T09:00:00.000Z" : null,
    completedAt: input.sessionState === "completed" ? "2026-08-24T10:00:00.000Z" : null,
    createdAt: "2026-08-24T08:00:00.000Z",
    updatedAt: "2026-08-24T10:00:00.000Z",
  };

  return renderToStaticMarkup(
    <FortuneJournalingPageClient
      deck={deck}
      modes={getTarotModes()}
      initialLandingView="library"
      initialJournalSessions={[]}
      initialMode={mode}
      initialSession={session}
      initialTurns={input.turns ?? []}
      recoveryError={null}
    />,
  );
}

describe("Fortune reflection workspace markup", () => {
  it("renders the shared workspace shell for ready-for-next-round without an inactive textarea", () => {
    const markup = renderReflectionWorkspace({ turns: [] });

    expect(markup).toContain('data-reflection-workspace="true"');
    expect(markup).toContain('data-reflection-center="ready-for-next-round"');
    expect(markup).toContain("Előzmények");
    expect(markup).toContain("Reflektív kérdés kérése");
    expect(markup).not.toContain('name="fortune-reflective-reply"');
  });

  it("shows persisted focus context in the reflection workspace and history recap when present", () => {
    const markup = renderReflectionWorkspace({
      focusText: "Munkahelyváltás körüli bizonytalanság",
      turns: [],
    });

    expect(markup).toContain("Fókusz: Munkahelyváltás körüli bizonytalanság");
  });

  it("renders the shared workspace shell for a current facilitator question", () => {
    const markup = renderReflectionWorkspace({
      turns: [
        {
          id: "turn-1",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 0,
          role: "assistant",
          turnKind: "reflective_prompt",
          content: JSON.stringify({
            mode: "question",
            reflection: "A lapok mintha ugyanazt a súrlódást forgatnák körbe.",
            question: "Mi az, amit egyszerre tartasz meg és engednél el?",
          }),
          createdAt: "2026-08-24T08:30:00.000Z",
        },
      ],
    });

    expect(markup).toContain('data-reflection-workspace="true"');
    expect(markup).toContain('data-reflection-center="awaiting-reply"');
    expect(markup).toContain('data-card-count="3"');
    expect(markup).toContain("0.");
    expect(markup).toContain("I.");
    expect(markup).toContain("II.");
    expect(markup).not.toContain(">02<");
    expect(markup).toContain("A lapok mintha ugyanazt a súrlódást forgatnák körbe.");
    expect(markup).toContain("Mi az, amit egyszerre tartasz meg és engednél el?");
    expect(markup).toContain('name="fortune-reflective-reply"');
    expect(markup).toContain('aria-label="Rögzítés"');
    expect(markup).toContain('aria-label="Előzmények"');
    expect(markup).not.toContain(">Rögzítés<");
    expect(markup).not.toContain("Pause");
    expect(markup).not.toContain("Complete");
    expect(markup).toContain('aria-label="Fortune Reflection Workspace bezárása"');
    expect(markup).not.toContain('aria-label="Vissza"');
  });

  it("marks the selected-card rail with 2, 3, and 4-card spread sizes", () => {
    const twoCardMarkup = renderReflectionWorkspace({
      modeId: "boundaries",
      turns: [],
    });
    const threeCardMarkup = renderReflectionWorkspace({
      modeId: "timeline",
      turns: [],
    });
    const fourCardMarkup = renderReflectionWorkspace({
      modeId: "system_view",
      turns: [],
    });

    expect(twoCardMarkup).toContain('data-card-count="2"');
    expect(threeCardMarkup).toContain('data-card-count="3"');
    expect(fourCardMarkup).toContain('data-card-count="4"');
  });

  it("renders a focus-led first facilitator question without the first-impression textarea after reflection has started", () => {
    const mode = getTarotModeById("timeline");
    const deck = getMajorArcanaDeck();
    const session: FortuneSession = {
      id: "fortune-focus-1",
      userId: "user-1",
      modeId: "timeline",
      focusText: "Munkahelyváltás körüli bizonytalanság",
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
      firstInterpretation: null,
      state: "active",
      pausedAt: null,
      completedAt: null,
      reflectionStartedAt: "2026-08-24T08:20:00.000Z",
      createdAt: "2026-08-24T08:00:00.000Z",
      updatedAt: "2026-08-24T10:00:00.000Z",
    };
    const markup = renderToStaticMarkup(
      <FortuneJournalingPageClient
        deck={deck}
        modes={getTarotModes()}
        initialLandingView="library"
        initialJournalSessions={[]}
        initialMode={mode}
        initialSession={session}
        initialTurns={[
          {
            id: "turn-1",
            sessionId: "fortune-focus-1",
            userId: "user-1",
            roundIndex: 0,
            role: "assistant",
            turnKind: "reflective_prompt",
            content: JSON.stringify({
              mode: "question",
              reflection: "A fókusz és a lapok mintha ugyanazt a mozgást kerülnék.",
              question: "Hol érzed most legerősebben ezt az alakulást a saját helyzetedben?",
            }),
            createdAt: "2026-08-24T08:30:00.000Z",
          },
        ]}
        recoveryError={null}
      />,
    );

    expect(markup).toContain('data-reflection-center="awaiting-reply"');
    expect(markup).toContain("Hol érzed most legerősebben ezt az alakulást a saját helyzetedben?");
    expect(markup).toContain('name="fortune-reflective-reply"');
    expect(markup).not.toContain('name="fortune-first-interpretation"');
  });

  it("keeps completed sessions outside the active reflection workspace shell", () => {
    const markup = renderReflectionWorkspace({
      sessionState: "completed",
      turns: [
        {
          id: "turn-1",
          sessionId: "fortune-1",
          userId: "user-1",
          roundIndex: 0,
          role: "assistant",
          turnKind: "reflective_prompt",
          content: JSON.stringify({
            mode: "resting_point",
            reflection: "Itt most már inkább lezárul valami.",
            question: null,
          }),
          createdAt: "2026-08-24T08:30:00.000Z",
        },
      ],
    });

    expect(markup).not.toContain('data-reflection-workspace="true"');
    expect(markup).toContain("A Fortune session lezárult");
  });
});
