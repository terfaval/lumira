// /app/evening/cards/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
import { supabase } from "@/src/lib/supabase/client";
import type { EveningCardCatalogItem } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function EveningCards() {
  const [cards, setCards] = useState<EveningCardCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const { loading } = useRequireAuth();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, is_active, content, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) setErr(error.message);
      else setCards((data ?? []) as EveningCardCatalogItem[]);
    })();
  }, []);

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
    <Shell title="Kártyák" space="evening">
      {loading ? (
        Spinner
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}

          <div className="stack">
            {cards.map((c) => (
              <Card key={c.slug} className="stack-tight">
                <div className="card-title">{c.title}</div>
                {c.content?.meta?.time && <div className="meta-block">{c.content.meta.time}</div>}

                <Link href={`/evening/card/${c.slug}`} className="btn btn-primary" style={{ width: "fit-content" }}>
                  Indítás
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
