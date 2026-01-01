"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
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

  return (
    <Shell title="Esti kártyák">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <>
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          <div style={{ display: "grid", gap: 10 }}>
            {cards.map((c) => (
              <Link
                key={c.slug}
                href={`/evening/card/${c.slug}`}
                style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
              >
                <div style={{ fontWeight: 700 }}>{c.title}</div>
                {c.content?.meta?.time && (
                  <div style={{ opacity: 0.7, fontSize: 12 }}>{c.content.meta.time}</div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}