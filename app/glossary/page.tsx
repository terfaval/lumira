import { CalmPlaceholderPage } from "@/src/ui/shared/calm-placeholder-page";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

export default async function GlossaryPage() {
  await requireAuthenticatedUserId();

  return (
    <main>
      <CalmPlaceholderPage
        title="Glossary Memory"
        description="This page will gather recurring personal motifs in a calm, descriptive way."
        quietNote="The initial scaffold is live without symbolic authority framing."
      />
    </main>
  );
}
