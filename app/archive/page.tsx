import { Suspense } from "react";
import ArchiveClient from "./ArchiveClient";

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <Suspense fallback={<div />}>
      <ArchiveClient searchParams={searchParams} />
    </Suspense>
  );
}
