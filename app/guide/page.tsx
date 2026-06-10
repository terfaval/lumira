import { GuideWorkspace } from "@/src/ui/guide/guide-workspace";

interface GuidePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const cardParam = resolvedSearchParams.card;
  const initialCardSlug = Array.isArray(cardParam) ? cardParam[0] ?? null : cardParam ?? null;

  return (
    <main>
      <GuideWorkspace initialCardSlug={initialCardSlug} />
    </main>
  );
}
