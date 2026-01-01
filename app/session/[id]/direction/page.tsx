"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { DirectionCatalogItem, MorningDirectionChoice } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function DirectionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [catalog, setCatalog] = useState<DirectionCatalogItem[]>([]);
  const [choice, setChoice] = useState<MorningDirectionChoice | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSlugs = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

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
      .select("id, session_id, chosen_direction_slugs, ai_recommendations, choice_source")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (chErr) return setErr(chErr.message);
    if (ch) {
      setChoice(ch as MorningDirectionChoice);
      const m: Record<string, boolean> = {};
      (ch.chosen_direction_slugs ?? []).forEach((s: string) => (m[s] = true));
      setSelected(m);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(slug: string) {
    setSelected((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const userId = await requireUserId();

      const payload = {
        session_id: sessionId,
        user_id: userId,
        ai_recommendations: [], // wireframe stub (NOT NULL!)
        chosen_direction_slugs: selectedSlugs.length ? selectedSlugs : null,
        choice_source: "catalog_only",
      };

      const { error } = await supabase
        .from("morning_direction_choices")
        .upsert(payload, { onConflict: "session_id" });

      if (error) throw error;

      router.push(`/session/${sessionId}/work`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Hiba";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Irányválasztás">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <>
          <p style={{ opacity: 0.8 }}>
            Válassz 0–n irányt. (Wireframe: egyelőre katalógusból.)
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {catalog.map((d) => (
              <label key={d.slug} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={!!selected[d.slug]} onChange={() => toggle(d.slug)} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{d.title}</div>
                    <div style={{ opacity: 0.8 }}>{d.description}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>slug: {d.slug}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={save} disabled={busy}>
              Mentés & tovább a blokkokhoz
            </PrimaryButton>
            <PrimaryButton onClick={() => router.push(`/session/${sessionId}`)}>
              Megállok (összkép)
            </PrimaryButton>
          </div>

          {choice && (
            <p style={{ marginTop: 12, opacity: 0.7 }}>
              Van már mentés ehhez a sessionhöz. (choice_source: {choice.choice_source})
            </p>
          )}
          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
        </>
      )}
    </Shell>
  );
}