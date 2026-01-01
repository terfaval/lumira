"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/Card";
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
      const meta = (card.content as { meta?: { version?: string | number | null } } | null)?.meta;
      const version = card.version ?? meta?.version ?? null;
      const { error } = await supabase.from("evening_card_usage_log").insert({
        user_id: userId,
        card_slug: slug,
        version,
      });

      if (error) throw error;
      setCompleted(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Nem sikerült menteni a befejezést.";
      setErr(message);
    } finally {
      setFinishing(false);
    }
  }

  if (completed) {
    return (
      <Shell title={card?.title ?? "Esti kártya"} space="evening">
        <div className="stack">
          <p style={{ fontWeight: 600 }}>Kész! Naplóztuk a kártya használatát.</p>
          <Link href="/evening/cards" className="btn btn-primary" style={{ width: "fit-content" }}>
            Vissza a kártyákhoz
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={card?.title ?? "Esti kártya"} space="evening">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div className="stack">
          {err && <p style={{ color: "crimson" }}>{err}</p>}
          {!card ? (
            <p>Betöltés…</p>
          ) : steps.length === 0 ? (
            <Card className="stack-tight">
              {card.content?.goal_md && <p style={{ whiteSpace: "pre-wrap" }}>{card.content.goal_md}</p>}
              <p>Nincsenek lépések ehhez a kártyához.</p>
              <Link href="/evening/cards" className="btn btn-secondary" style={{ width: "fit-content" }}>
                Vissza a kártyákhoz
              </Link>
            </Card>
          ) : (
            <div className="stack">
              {card.content?.goal_md && (
                <Card>
                  <div className="stack-tight">
                    <div className="section-title">Cél</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{card.content.goal_md}</div>
                  </div>
                </Card>
              )}

              <Card className="stack-tight">
                <div className="meta-block">Lépés {stepIndex + 1} / {steps.length}</div>
                {currentStep?.context_md && <div style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{currentStep.context_md}</div>}
                {currentStep?.question && <div style={{ fontWeight: 700, fontSize: 16 }}>{currentStep.question}</div>}
                <textarea
                  value={answers[stepIndex] ?? ""}
                  onChange={(e) => updateAnswer(e.target.value)}
                  rows={4}
                  placeholder="Jegyzeteid ide kerülnek (nem mentjük el)"
                />

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    disabled={!canGoBack}
                    className="btn btn-secondary"
                    style={{ opacity: canGoBack ? 1 : 0.6 }}
                  >
                    Vissza
                  </button>
                  {canGoNext ? (
                    <button onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))} className="btn btn-secondary">
                      Következő
                    </button>
                  ) : (
                    <button onClick={finishRun} disabled={finishing} className="btn btn-primary">
                      {finishing ? "Mentés…" : "Befejezés"}
                    </button>
                  )}
                </div>
                {!canGoNext && (
                  <button onClick={finishRun} disabled={finishing} className="btn btn-primary" style={{ width: "fit-content" }}>
                    {finishing ? "Mentés…" : "Befejezés"}
                  </button>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}