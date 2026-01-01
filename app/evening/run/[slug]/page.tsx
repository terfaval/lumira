"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";

export default function EveningRun() {
  const { slug } = useParams<{ slug: string }>();
  const [card, setCard] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);

      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, content")
        .eq("slug", slug)
        .single();

      if (error) return setErr(error.message);
      setCard(data);

      // usage log: opened
      try {
        const userId = await requireUserId();
        await supabase.from("evening_card_usage_log").insert({
          user_id: userId,
          card_slug: slug,
          action: "opened",
          catalog_version: data?.content?.version ?? "v3",
        });
      } catch {
        // wireframe: ignore log errors
      }
    })();
  }, [slug]);

  return (
    <Shell title={card?.title ?? "Esti kártya"}>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {!card ? (
        <p>Betöltés…</p>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          {JSON.stringify(card.content, null, 2)}
        </pre>
      )}
    </Shell>
  );
}
