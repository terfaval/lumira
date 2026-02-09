import { Suspense } from "react";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import DreamMapLayout from "@/components/dreammap/DreamMapLayout";
import DreamMapLayoutV2 from "@/components/dreammap/DreamMapLayoutV2";

export default function Page() {
  const useV2 = process.env.NEXT_PUBLIC_DREAMMAP_V2 === "true";
  return (
    <Suspense fallback={<FullScreenLoadingOverlay open />}>
      {useV2 ? <DreamMapLayoutV2 /> : <DreamMapLayout />}
    </Suspense>
  );
}
