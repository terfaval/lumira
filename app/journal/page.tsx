import { CalmPlaceholderPage } from "@/src/ui/shared/calm-placeholder-page";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

export default async function JournalPage() {
  await requireAuthenticatedUserId();

  return (
    <main>
      <CalmPlaceholderPage
        title="Dream Journal"
        description="This route will host revisitable dream entries in an archive posture."
        quietNote="The v1 scaffold avoids feed or productivity pressure."
      />
    </main>
  );
}
