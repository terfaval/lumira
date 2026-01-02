import { Suspense } from "react";
import ArchiveClient from "./ArchiveClient";

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <ArchiveClient />
    </Suspense>
  );
}