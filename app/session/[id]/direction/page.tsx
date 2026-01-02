"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { startDirection } from "@/src/lib/startDirection";
import type { DirectionCatalogItem } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);

    const { data: cat, error: catErr } = await supabase
      .from("direction_catalog")
      .select("slug, title, description, is_active, content")
      .eq("is_active", true)
      .order("slug", { ascending: true });

    if (catErr) return setErr(catErr.message);
    setCatalog((cat ?? []) as DirectionCatalogItem[]);

    const { data: ch, error: chErr } = await supabase
      .from("morning_direction_choices")
      .select("direction_slug")
      .eq("session_id", sessionId);

    if (chErr) return setErr(chErr.message);
    if (ch) {
      const m: Record<string, boolean> = {};
      ch.forEach((row: { direction_slug: string }) => {
        m[row.direction_slug] = true;
      });
      setSelected(m);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = useCallback(
    async (slug: string) => {
      setBusy(true);
      setErr(null);
      try {
        const result = await startDirection(sessionId, slug);
        if (!result.success) {
          // Do not navigate if persist failed; processing space depends on this choice.
          setErr("Hiba történt, próbáld újra.");
          return;
        }

        setSelected((prev) => ({ ...prev, [slug]: true }));

        router.push(`/session/${sessionId}/work?direction=${encodeURIComponent(slug)}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba";
        setErr(message);
      } finally {
        setBusy(false);
      }
    },
    [router, sessionId]
  );

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
    <Shell title="Irányválasztás">
      {loading ? (
        Spinner
      ) : (
        <>
          <p style={{ opacity: 0.8 }}>
            Válassz egy irányt, ami most a legtermészetesebbnek tűnik.
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {catalog.map((d) => (
              <button
                key={d.slug}
                type="button"
                onClick={() => handleStart(d.slug)}
                disabled={busy}
                style={{
                  textAlign: "left",
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 12,
                }}
                className="card"
              >
                <div className="stack-tight">
                  <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{d.title}</span>
                    {selected[d.slug] && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>(korábban kiválasztva)</span>
                    )}
                  </div>
                  <div style={{ opacity: 0.8 }}>{d.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={() => router.push(`/session/${sessionId}`)}>
              Összkép
            </PrimaryButton>
          </div>

          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
        </>
      )}
    </Shell>
  );
}
