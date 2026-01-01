"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
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
    <Shell title={card?.title ?? "Esti kártya"} space="evening">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          {!card ? (
            <p>Betöltés…</p>
          ) : (
            <div className="stack">
              {goal && (
                <Card>
                  <div className="stack-tight">
                    <div className="section-title">Cél</div>
                    <p style={{ whiteSpace: "pre-wrap" }}>{goal}</p>
                  </div>
                </Card>
              )}

              {(meta?.time || meta?.not_recommended) && (
                <Card muted>
                  <div className="stack-tight">
                    {meta?.time && <div>Időkeret: {meta.time}</div>}
                    {meta?.not_recommended && <div style={{ color: "#f1a6a6" }}>Nem ajánlott: {meta.not_recommended}</div>}
                  </div>
                </Card>
              )}

              {tips && tips.length > 0 && (
                <Card>
                  <div className="stack-tight">
                    <div className="section-title">Tippek</div>
                    <ul style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
                      {tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              )}

              <Link href={`/evening/run/${slug}`} className="btn btn-primary" style={{ width: "fit-content" }}>
                Indítás
              </Link>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}