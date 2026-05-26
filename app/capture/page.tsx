import { CalmPlaceholderPage } from "@/src/ui/shared/calm-placeholder-page";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

export default async function CapturePage() {
  await requireAuthenticatedUserId();

  return (
    <main>
      <CalmPlaceholderPage
        title="Capture"
        description="Capture remains the most direct entry. This surface will hold the dedicated dream-first writing flow."
        quietNote="For now, this route is intentionally simple and quiet."
      />
    </main>
  );
}
