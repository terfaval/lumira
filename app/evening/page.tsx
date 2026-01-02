"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function EveningLanding() {
  const { loading } = useRequireAuth();

  const Spinner = (
    <>
      <div
        aria-label="Betöltés"
        className="spinner"
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          border: "2px solid var(--border)",
          borderTopColor: "var(--text-muted)",
          animation: "spin 0.9s linear infinite",
          marginTop: 8,
        }}
      />
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );

  return (
    <Shell title="Álom előkészítő gyakorlatok" space="evening">
      {loading ? (
        Spinner
      ) : (
        <div className="stack">
          <p style={{ color: "var(--text-muted)" }}>
            Egy rövid esti tér: lecsendesítés, ráhangolódás az alvásra.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/evening/cards" className="btn btn-primary">
              Kártyák
            </Link>
            <Link href="/new" className="btn btn-secondary">
              Álomtér
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}
