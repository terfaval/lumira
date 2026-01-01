"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { requireUserId } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase/client";
import type { EveningCardCatalogItem } from "@/src/lib/types";

type EveningCardStep = {
  context_md?: string;
  question?: string;
};

export default function EveningRun() {
  const { slug } = useParams<{ slug: string }>();
  const { loading } = useRequireAuth();
  const [card, setCard] = useState<EveningCardCatalogItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, content, version")
        .eq("slug", slug)
        .single();

      if (error) {
        setErr(error.message);
        return;
      }

      const typed = (data ?? null) as EveningCardCatalogItem | null;
      setCard(typed);

      const steps = (typed?.content?.steps ?? []) as EveningCardStep[];
      setAnswers(Array.from({ length: steps.length }, () => ""));
      setStepIndex(0);
    })();
  }, [slug]);

  const steps: EveningCardStep[] = useMemo(() => {
    return (card?.content?.steps ?? []) as EveningCardStep[];
  }, [card]);

  const currentStep = steps[stepIndex];

  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < steps.length - 1;

  function updateAnswer(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[stepIndex] = value;
      return next;
    });
  }

  async function finishRun() {
    if (!card) return;
    setFinishing(true);
    setErr(null);
    try {
      const userId = await requireUserId();
      const version = (card as any).version ?? card.content?.meta?.version ?? null;
      const { error } = await supabase.from("evening_card_usage_log").insert({
        user_id: userId,
        card_slug: slug,
        version,
      });

      if (error) throw error;
      setCompleted(true);
    } catch (e: any) {
      setErr(e?.message ?? "Nem sikerült menteni a befejezést.");
    } finally {
      setFinishing(false);
    }
  }

  if (completed) {
    return (
      <Shell title={card?.title ?? "Esti kártya"}>
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ fontWeight: 600 }}>Kész! Naplóztuk a kártya használatát.</p>
          <Link
            href="/evening/cards"
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "10px 16px",
              borderRadius: 10,
              background: "#111827",
              color: "white",
            }}
          >
            Vissza a kártyákhoz
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={card?.title ?? "Esti kártya"}>
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          {!card ? (
            <p>Betöltés…</p>
          ) : steps.length === 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {card.content?.goal_md && (
                <p style={{ whiteSpace: "pre-wrap" }}>{card.content.goal_md}</p>
              )}
              <p>Nincsenek lépések ehhez a kártyához.</p>
              <Link href="/evening/cards" style={{ textDecoration: "underline" }}>
                Vissza a kártyákhoz
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {card.content?.goal_md && (
                <div
                  style={{
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Cél</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{card.content.goal_md}</div>
                </div>
              )}

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 14,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.7 }}>Lépés {stepIndex + 1} / {steps.length}</div>
                {currentStep?.context_md && (
                  <div style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{currentStep.context_md}</div>
                )}
                {currentStep?.question && (
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{currentStep.question}</div>
                )}
                <textarea
                  value={answers[stepIndex] ?? ""}
                  onChange={(e) => updateAnswer(e.target.value)}
                  rows={4}
                  style={{ width: "100%", borderRadius: 8, padding: 8, borderColor: "#d1d5db" }}
                  placeholder="Jegyzeteid ide kerülnek (nem mentjük el)"
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    disabled={!canGoBack}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: canGoBack ? "white" : "#f3f4f6",
                      cursor: canGoBack ? "pointer" : "not-allowed",
                    }}
                  >
                    Vissza
                  </button>
                  {canGoNext ? (
                    <button
                      onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        background: "white",
                      }}
                    >
                      Következő
                    </button>
                  ) : (
                    <button
                      onClick={finishRun}
                      disabled={finishing}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "white",
                        opacity: finishing ? 0.7 : 1,
                      }}
                    >
                      {finishing ? "Mentés…" : "Befejezés"}
                    </button>
                  )}
                </div>
                {!canGoNext && (
                  <button
                    onClick={finishRun}
                    disabled={finishing}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "white",
                      opacity: finishing ? 0.7 : 1,
                    }}
                  >
                    {finishing ? "Mentés…" : "Befejezés"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}