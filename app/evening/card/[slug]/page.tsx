"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { supabase } from "@/src/lib/supabase/client";
import type { EveningCardCatalogItem } from "@/src/lib/types";

export default function EveningCardPreview() {
  const { slug } = useParams<{ slug: string }>();
  const { loading } = useRequireAuth();
  const [card, setCard] = useState<EveningCardCatalogItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, content, version")
        .eq("slug", slug)
        .single();

      if (error) setErr(error.message);
      else setCard((data ?? null) as EveningCardCatalogItem | null);
    })();
  }, [slug]);

  const goal = card?.content?.goal_md;
  const meta = card?.content?.meta;
  const tips: string[] | undefined = card?.content?.tips;

  return (
    <Shell title={card?.title ?? "Esti kártya"}>
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          {!card ? (
            <p>Betöltés…</p>
          ) : (
            <>
              {goal && <p style={{ whiteSpace: "pre-wrap" }}>{goal}</p>}

              {(meta?.time || meta?.not_recommended) && (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 10,
                    background: "#fafafa",
                  }}
                >
                  {meta?.time && <div>Időkeret: {meta.time}</div>}
                  {meta?.not_recommended && (
                    <div style={{ color: "#9b1c1c" }}>Nem ajánlott: {meta.not_recommended}</div>
                  )}
                </div>
              )}

              {tips && tips.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Tippek</div>
                  <ul style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
                    {tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href={`/evening/run/${slug}`}
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "#111827",
                  color: "white",
                }}
              >
                Indítás
              </Link>
            </>
          )}
        </div>
      )}
    </Shell>
  );
}