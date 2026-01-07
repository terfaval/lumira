import { Suspense } from "react";
import ArchiveClient from "./ArchiveClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ArchiveClient />
    </Suspense>
  );
}
