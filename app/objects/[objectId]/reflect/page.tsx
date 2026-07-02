import { redirect } from "next/navigation";

interface ObjectReflectPageProps {
  params: Promise<{ objectId: string }>;
}

export default async function ObjectReflectPage({ params }: ObjectReflectPageProps) {
  const { objectId } = await params;
  redirect(`/objects/${encodeURIComponent(objectId)}`);
}
