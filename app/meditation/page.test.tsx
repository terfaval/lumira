import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const loadMeditationsMock = vi.fn();
const loadMeditationAudioMapMock = vi.fn();
const meditationSpaceMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children?: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/src/features/meditation", () => ({
  MeditationSpace: (props: unknown) => {
    meditationSpaceMock(props);
    return <div data-testid="meditation-space" />;
  },
  loadMeditations: loadMeditationsMock,
  loadMeditationAudioMap: loadMeditationAudioMapMock,
}));

describe("MeditationPage", () => {
  it("renders the meditation page with a homepage back link", async () => {
    const meditations = [{ id: "meditation-1" }];
    const audioMap = { version: "1", items: {} };
    loadMeditationsMock.mockResolvedValue(meditations);
    loadMeditationAudioMapMock.mockResolvedValue(audioMap);

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain('href="/"');
    expect(markup).toContain("Vissza a főoldalra");
    expect(loadMeditationsMock).toHaveBeenCalledTimes(1);
    expect(loadMeditationAudioMapMock).toHaveBeenCalledTimes(1);
    expect(meditationSpaceMock).toHaveBeenCalledWith({
      meditations,
      audioMap,
    });
  });
});
