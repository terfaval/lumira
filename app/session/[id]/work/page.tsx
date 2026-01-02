"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { SplitLayout } from "@/components/SplitLayout";
import { DreamRawPanel } from "@/components/DreamRawPanel";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { isDirectionCardContent, type DirectionCardContent, type WorkBlock } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

type DirectionWorkBlock = WorkBlock & { content: DirectionCardContent };

export default function WorkPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loading } = useRequireAuth();
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ensuredInitial, setEnsuredInitial] = useState(false);

  const directionSlug = searchParams?.get("direction") ?? "";

  const directionBlocks = useMemo(
    () =>
      blocks
        .map((block) =>
          isDirectionCardContent(block.content)
            ? ({ ...block, content: normalizeContent(block.content) } as DirectionWorkBlock)
            : null
        )
        .filter((b): b is DirectionWorkBlock => !!b && (!directionSlug || b.content.direction_slug === directionSlug)),
    [blocks, directionSlug]
  );

  const current = useMemo(
    () => directionBlocks.find((b) => (b.content.state ?? "open") === "open") ?? directionBlocks[0],
    [directionBlocks]
  );

  const load = useCallback(async () => {
    setErr(null);
    setLoaded(false);
    const { data, error } = await supabase
      .from("work_blocks")
      .select("id, session_id, user_id, block_type, content, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("block_type", "dream_analysis")
      .order("created_at", { ascending: true });
    if (error) setErr("Nem sikerült betölteni a kártyákat.");
    else setBlocks((data ?? []) as WorkBlock[]);
    setLoaded(true);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setEnsuredInitial(false);
  }, [directionSlug]);

  const nextSequence = useMemo(
    () => directionBlocks.reduce((max, block) => Math.max(max, block.content.sequence ?? 0), 0) + 1,
    [directionBlocks]
  );

  const generateDirectionBlock = useCallback(async () => {
    if (!directionSlug) {
      setErr("Előbb válassz irányt.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const userId = await requireUserId();
      const content: DirectionCardContent = {
        kind: "direction_card",
        direction_slug: directionSlug,
        sequence: nextSequence,
        state: "open",
        ai: {
          context: "Most csak egy apró pontot nézünk meg ebből az álomból.",
          question: "Mi az a részlet, ami most a leginkább megmaradt benned?",
        },
        user: { answer: null, answered_at: null },
      };

      const { error } = await supabase.from("work_blocks").insert({
        session_id: sessionId,
        user_id: userId,
        block_type: "dream_analysis",
        content,
      });

      if (error) throw error;
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Hiba";
      setErr("Nem sikerült új kártyát létrehozni.");
      console.error(message);
    } finally {
      setBusy(false);
    }
  }, [directionSlug, load, nextSequence, sessionId]);

  useEffect(() => {
    if (!directionSlug || loading || busy || ensuredInitial || !loaded) return;
    if (directionBlocks.length === 0) {
      void generateDirectionBlock();
    }
    setEnsuredInitial(true);
  }, [busy, directionBlocks.length, directionSlug, ensuredInitial, generateDirectionBlock, loaded, loading]);

  const saveAnswer = useCallback(
    async (block: DirectionWorkBlock, answer: string) => {
      setBusy(true);
      setErr(null);
      try {
        const existingContent = normalizeContent(block.content);
        const trimmed = answer.trim();
        const updatedContent: DirectionCardContent = {
          ...existingContent,
          state: trimmed ? "answered" : "open",
          user: {
            ...(existingContent.user ?? {}),
            answer: trimmed,
            answered_at: trimmed ? new Date().toISOString() : null,
          },
        };

        const { error } = await supabase.from("work_blocks").update({ content: updatedContent }).eq("id", block.id);
        if (error) throw error;
        await load();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Hiba";
        setErr("Nem sikerült menteni a választ.");
        console.error(message);
      } finally {
        setBusy(false);
      }
    },
    [load]
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
    <Shell title="Kártyás feldolgozás" space="dream">
      {loading ? (
        Spinner
      ) : (
        <SplitLayout
          leftTitle="Nyers álom"
          left={<DreamRawPanel sessionId={sessionId} />}
          rightTitle="Feldolgozás"
          right={
            !directionSlug ? (
              <div className="stack">
                <p style={{ color: "var(--text-muted)" }}>
                  Válassz egy irányt az <Link href={`/session/${sessionId}/direction`}>irányválasztó</Link> oldalon, majd térj
                  vissza ide.
                </p>
              </div>
            ) : (
              <div className="stack">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <PrimaryButton onClick={() => router.push(`/session/${sessionId}`)} variant="secondary">
                    Összkép
                  </PrimaryButton>
                </div>

                <hr className="hr-soft" />

                {directionBlocks.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>
                    Még nincs kártya ehhez az irányhoz.
                  </p>
                ) : (
                  <div className="stack">
                    {directionBlocks.map((b) => (
                      <BlockCard
                        key={`${b.id}-${b.content.user?.answered_at ?? ""}-${b.content.user?.answer ?? ""}`}
                        block={b}
                        onSave={saveAnswer}
                        busy={busy}
                      />
                    ))}
                  </div>
                )}

                {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
                {/* Aktív blokk: csak vizuális jel (szöveg nélkül). A jelenlegi UI-ban ez most nem jelenik meg külön. */}
                {current && null}
              </div>
            )
          }
        />
      )}
    </Shell>
  );
}

function BlockCard({
  block,
  onSave,
  busy,
}: {
  block: DirectionWorkBlock;
  onSave: (block: DirectionWorkBlock, answer: string) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(block.content.user?.answer ?? "");

  const stateLabel = block.content.state ?? "open";
  const answeredAt = block.content.user?.answered_at;

  return (
    <Card>
      <div className="stack-tight">
        <div className="meta-block">
          <span className="badge-muted">#{block.content.sequence}</span>
          <span className="badge-muted">Állapot: {stateLabel}</span>
          {answeredAt && <span className="badge-muted">Válaszolva: {new Date(answeredAt).toLocaleString("hu-HU")}</span>}
        </div>

        <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
          {block.content.ai?.context ?? "Most csak egy apró pontot nézünk meg ebből az álomból."}
        </div>

        <div style={{ fontWeight: 700 }}>
          {block.content.ai?.question ?? "Mi az a részlet, ami most a leginkább megmaradt benned?"}
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Rögzítés (opcionális)"
        />

        <div style={{ display: "flex", gap: 10 }}>
          <PrimaryButton onClick={() => onSave(block, draft)} disabled={busy}>
            Rögzítés
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

function normalizeContent(content: DirectionCardContent): DirectionCardContent {
  return {
    ...content,
    user: {
      ...content.user,
      answer: content.user?.answer ?? null,
      answered_at: content.user?.answered_at ?? null,
    },
    sequence: content.sequence ?? 0,
    state: content.state ?? "open",
    ai: {
      ...content.ai,
      context: content.ai?.context ?? null,
      question: content.ai?.question ?? null,
    },
  };
}