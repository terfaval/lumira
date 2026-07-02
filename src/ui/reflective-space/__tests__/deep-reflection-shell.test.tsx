import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DeepReflectionPayload } from "@/src/reflective-space/composition/compose-deep-reflection-payload";
import { DeepReflectionShell } from "@/src/ui/reflective-space/deep-reflection-shell";

const payloadWithSupport: DeepReflectionPayload = {
  center: {
    kind: "thread",
    id: "thread-1",
    status: "continued",
  },
  thread: {
    id: "thread-1",
    title: "Doorway thread",
    state: "active",
    resolution: "reused",
  },
  openingContext: {
    openingId: "opening-1",
    text: "What shifts at the doorway?",
    tone: "gentle",
    kind: "reflective_question",
    state: "activated",
    prompt: "A threshold between staying and moving.",
    activationContext: "reflective_space_surface",
  },
  dialogue: {
    entries: [
      {
        id: "opening:opening-1",
        role: "opening",
        createdAt: "2026-06-20T10:00:00.000Z",
        openingId: "opening-1",
        text: "What shifts at the doorway?",
        tone: "gentle",
        kind: "reflective_question",
      },
    ],
    latestAssistantEntryId: null,
  },
  nearbyContext: {
    cards: [
      {
        id: "fragment:1",
        kind: "supporting_fragment",
        title: "Supporting Fragment",
        summary: "the doorway",
        details: ["doorway"],
      },
    ],
  },
  alternateOpenings: {
    items: [
      {
        id: "opening-2",
        title: "The stairs may carry the same tension.",
        tone: "calm",
        kind: "continuity_noticing",
        state: "new",
      },
    ],
  },
};

const payloadWithoutSupport: DeepReflectionPayload = {
  ...payloadWithSupport,
  nearbyContext: { cards: [] },
  alternateOpenings: { items: [] },
};

describe("DeepReflectionShell", () => {
  it("renders the shell with Hungarian copy, back navigation, and an embedded send action", () => {
    const markup = renderToStaticMarkup(<DeepReflectionShell payload={payloadWithSupport} reflectiveObjectId="object-1" />);

    expect(markup).toContain("What shifts at the doorway?");
    expect(markup).toContain(">Megnyitás<");
    expect(markup).toContain(">Kontextus<");
    expect(markup).toContain('href="/objects/object-1"');
    expect(markup).toContain('aria-label="Vissza az orientációhoz"');
    expect(markup).toContain('aria-label="Küldés"');
    expect(markup).toContain('placeholder="Írd le, amit gondolsz..."');
    expect(markup).toContain("entryOpeningLayer");
    expect(markup).toContain("threadMain");
    expect(markup).not.toContain("Doorway thread");
    expect(markup).not.toContain("A threshold between staying and moving.");
    expect(markup).not.toContain(">Opening<");
    expect(markup).not.toContain(">Context<");
    expect(markup).not.toContain("Stay with this thread in your own words.");
    expect(markup).not.toContain("Write what is present here.");
    expect(markup).not.toContain("Save reflection");
  });

  it("omits support markup entirely and marks the centered no-rail state when no support exists", () => {
    const markup = renderToStaticMarkup(<DeepReflectionShell payload={payloadWithoutSupport} reflectiveObjectId="object-1" />);

    expect(markup).not.toContain("Nearby Context");
    expect(markup).not.toContain("Alternate Openings");
    expect(markup).not.toContain(">Kontextus<");
    expect(markup).toContain("threadColumnCentered");
  });

  it("renders a stronger user depth layer than the opening layer", () => {
    const payloadWithReply: DeepReflectionPayload = {
      ...payloadWithSupport,
      dialogue: {
        entries: [
          ...payloadWithSupport.dialogue.entries,
          {
            id: "response:1",
            role: "user",
            createdAt: "2026-06-20T10:05:00.000Z",
            responseId: "response-1",
            text: "Itt valami megakad bennem.",
            title: null,
          },
        ],
        latestAssistantEntryId: null,
      },
    };

    const markup = renderToStaticMarkup(<DeepReflectionShell payload={payloadWithReply} reflectiveObjectId="object-1" />);

    expect(markup).toContain("entryOpeningLayer");
    expect(markup).toContain("entryUserLayer");
  });
});
