import { Suspense } from "react";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import DreamMapLayout from "@/components/dreammap/DreamMapLayout";

export default function Page() {
  return (
    <Suspense fallback={<FullScreenLoadingOverlay open />}>
      <DreamMapLayout />
    </Suspense>
  );
}
