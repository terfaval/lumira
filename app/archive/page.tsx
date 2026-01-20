import { Suspense } from "react";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import ArchiveClient from "./ArchiveClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <FullScreenLoadingOverlay open />
      }
    >
      <ArchiveClient />
    </Suspense>
  );
}
