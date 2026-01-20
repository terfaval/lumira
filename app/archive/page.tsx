import { Suspense } from "react";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";
import ArchiveClient from "./ArchiveClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "grid", placeItems: "center", padding: "var(--space-5)" }}>
          <LumiraLoader size={42} spinSeconds={10} tone="light" />
        </div>
      }
    >
      <ArchiveClient />
    </Suspense>
  );
}
