import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const requireAuthenticatedUserIdMock = vi.fn();
const getMembershipByUserIdMock = vi.fn();
const loadMeditationsMock = vi.fn();
const loadMeditationAudioMapMock = vi.fn();
const meditationSpaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/src/features/meditation", () => ({
  MeditationSpace: (props: unknown) => {
    meditationSpaceMock(props);
    return <div data-testid="meditation-space" />;
  },
}));

vi.mock("@/src/features/meditation/server", () => ({
  loadMeditations: loadMeditationsMock,
  loadMeditationAudioMap: loadMeditationAudioMapMock,
}));

vi.mock("@/src/features/meditation/components/MeditationSpace", () => ({
  default: (props: unknown) => {
    meditationSpaceMock(props);
    return <div data-testid="meditation-space" />;
  },
}));

vi.mock("@/src/ui/shared/require-authenticated-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-admin-repository", () => ({
  createAdminRepository: () => ({
    getMembershipByUserId: getMembershipByUserIdMock,
  }),
}));

describe("MeditationPage", () => {
  it("renders the meditation page client shell with meditation space props", async () => {
    const meditations = [{ id: "meditation-1" }];
    const audioMap = { version: "1", items: {} };
    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    getMembershipByUserIdMock.mockResolvedValue({ userId: "user-1", role: "admin" });
    loadMeditationsMock.mockResolvedValue(meditations);
    loadMeditationAudioMapMock.mockResolvedValue(audioMap);

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Vissza a meditacios terbe");
    expect(requireAuthenticatedUserIdMock).toHaveBeenCalledTimes(1);
    expect(getMembershipByUserIdMock).toHaveBeenCalledWith("user-1");
    expect(loadMeditationsMock).toHaveBeenCalledTimes(1);
    expect(loadMeditationAudioMapMock).toHaveBeenCalledTimes(1);
    expect(meditationSpaceMock).toHaveBeenCalledWith({
      meditations,
      audioMap,
      isAdmin: true,
      onReaderOpenChange: expect.any(Function),
      onEditorModeChange: expect.any(Function),
    });
  });
});
