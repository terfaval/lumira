"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { supabase } from "@/src/lib/supabase/client";
import type { EveningCardCatalogItem } from "@/src/lib/types";

export default function EveningCards() {
  const [cards, setCards] = useState<EveningCardCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, is_active, content")
        .eq("is_active", true)
        .order("slug", { ascending: true });

      if (error) setErr(error.message);
      else setCards((data ?? []) as EveningCardCatalogItem[]);
    })();
  }, []);

  return (
    <Shell title="Esti kártyák">
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {cards.map((c) => (
          <Link key={c.slug} href={`/evening/run/${c.slug}`} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ opacity: 0.6, fontSize: 12 }}>{c.slug}</div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
