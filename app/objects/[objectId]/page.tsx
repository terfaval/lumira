import { CalmPlaceholderPage } from "@/src/ui/shared/calm-placeholder-page";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

interface ObjectOrientationPageProps {
  params: Promise<{ objectId: string }>;
}

export default async function ObjectOrientationPage({ params }: ObjectOrientationPageProps) {
  await requireAuthenticatedUserId();
  const { objectId } = await params;

  return (
    <main>
      <CalmPlaceholderPage
        title="Object Orientation"
        description={`Object ${objectId} can be revisited from here with local reflective context.`}
        quietNote="The detailed object orientation IA is intentionally deferred in this scaffold."
      />
    </main>
  );
}
