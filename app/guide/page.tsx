import { CalmPlaceholderPage } from "@/src/ui/shared/calm-placeholder-page";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

export default async function GuidePage() {
  await requireAuthenticatedUserId();

  return (
    <main>
      <CalmPlaceholderPage
        title="Guide"
        description="Guide space will provide quiet references for sleep and dream practice."
        quietNote="This first route stays lightweight and non-urgent."
      />
    </main>
  );
}
