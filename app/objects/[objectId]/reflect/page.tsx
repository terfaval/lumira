import { CalmPlaceholderPage } from "@/src/ui/shared/calm-placeholder-page";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

interface ObjectReflectPageProps {
  params: Promise<{ objectId: string }>;
}

export default async function ObjectReflectPage({ params }: ObjectReflectPageProps) {
  await requireAuthenticatedUserId();
  const { objectId } = await params;

  return (
    <main>
      <CalmPlaceholderPage
        title="Deep Reflection"
        description={`Object ${objectId} can open a deeper reflection posture on this route.`}
        quietNote="This placeholder keeps the route calm while deep reflection IA is prepared."
      />
    </main>
  );
}
