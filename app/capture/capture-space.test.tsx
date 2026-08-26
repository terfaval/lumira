import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useFormStatusMock } = vi.hoisted(() => ({
  useFormStatusMock: vi.fn(),
}));

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");

  return {
    ...actual,
    useFormStatus: useFormStatusMock,
  };
});

import { CaptureSpace } from "@/app/capture/capture-space";

describe("CaptureSpace", () => {
  beforeEach(() => {
    useFormStatusMock.mockReset();
    useFormStatusMock.mockReturnValue({ pending: false });
  });

  it("renders the idle submit state by default", () => {
    const markup = renderToStaticMarkup(<CaptureSpace action={async () => {}} />);

    expect(markup).toContain("Rögzítés");
    expect(markup).not.toContain("Feldolgozás...");
    expect(markup).not.toContain("disabled");
    expect(markup).toContain("0 szó · 0 karakter");
  });

  it("locks the capture surface and shows processing feedback while submission is pending", () => {
    useFormStatusMock.mockReturnValue({ pending: true });

    const markup = renderToStaticMarkup(<CaptureSpace action={async () => {}} />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('textarea');
    expect(markup).toContain('name="dreamText"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("Feldolgozás...");
    expect(markup).not.toContain(">Rögzítés<");
  });
});
