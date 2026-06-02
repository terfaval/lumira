import { ReflectiveSpaceWorkspace } from "@/src/ui/reflective-space/reflective-space-workspace";
import { prepareLatentOpeningForReflection } from "@/src/runtime/orchestration/prepare-latent-opening-for-reflection";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

interface ObjectReflectPageProps {
  params: Promise<{ objectId: string }>;
}

export default async function ObjectReflectPage({ params }: ObjectReflectPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { objectId } = await params;

  try {
    await prepareLatentOpeningForReflection({
      userId,
      reflectiveObjectId: objectId,
    });
  } catch (error) {
    console.error("Reflection preparation failed; continuing with workspace fallback.", error);
  }

  return (
    <main>
      <ReflectiveSpaceWorkspace initialCenterObjectId={objectId} />
    </main>
  );
}
