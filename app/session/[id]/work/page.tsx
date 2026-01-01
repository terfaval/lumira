"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { WorkBlock } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function WorkPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading } = useRequireAuth();
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const current = useMemo(() => blocks.find((b) => b.block_state === "open") ?? blocks[0], [blocks]);

  const load = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("work_blocks")
      .select("id, session_id, direction_slug, sequence, ai_context, ai_question, user_answer, block_state")
      .eq("session_id", sessionId)
      .order("sequence", { ascending: true });
    if (error) setErr(error.message);
    else setBlocks((data ?? []) as WorkBlock[]);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateDummyBlock() {
    setBusy(true);
    setErr(null);
    try {
      const userId = await requireUserId();
      const nextSeq = (blocks.at(-1)?.sequence ?? 0) + 1;

      const { error } = await supabase.from("work_blocks").insert({
        session_id: sessionId,
        user_id: userId,
        sequence: nextSeq,
        direction_slug: null,
        ai_context: "Most csak egy apró pontot nézünk meg ebből az álomból.",
        ai_question: "Mi az a részlet, ami most a leginkább megmaradt benned?",
        block_state: "open",
      });

      if (error) throw error;
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Hiba";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswer(blockId: string, answer: string) {
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase
        .from("work_blocks")
        .update({
          user_answer: answer,
          answered_at: new Date().toISOString(),
          block_state: answer.trim() ? "answered" : "open",
        })
        .eq("id", blockId);
      if (error) throw error;
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Hiba";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Kártyás feldolgozás" space="dream">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <div className="stack">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={generateDummyBlock} disabled={busy}>
              + 1 blokk (wireframe stub)
            </PrimaryButton>
            <PrimaryButton onClick={() => router.push(`/session/${sessionId}`)} variant="secondary">
              Összkép
            </PrimaryButton>
          </div>

          <hr className="hr-soft" />

          {blocks.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Még nincs blokk. Adj hozzá egyet a gombbal.</p>
          ) : (
            <div className="stack">
              {blocks.map((b) => (
                <BlockCard key={b.id} block={b} onSave={saveAnswer} busy={busy} />
              ))}
            </div>
          )}

          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
          {current && <p style={{ marginTop: 12, opacity: 0.7 }}>Aktív blokk: #{current.sequence}</p>}
        </div>
      )}
    </Shell>
  );
}

function BlockCard({
  block,
  onSave,
  busy,
}: {
  block: WorkBlock;
  onSave: (id: string, answer: string) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(block.user_answer ?? "");

  return (
    <Card>
      <div className="stack-tight">
        <div className="meta-block">
          <span className="badge-muted">#{block.sequence}</span>
          <span className="badge-muted">Állapot: {block.block_state}</span>
        </div>
        <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{block.ai_context}</div>
        <div style={{ fontWeight: 700 }}>{block.ai_question}</div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Válasz (opcionális)"
        />

        <div style={{ display: "flex", gap: 10 }}>
          <PrimaryButton onClick={() => onSave(block.id, draft)} disabled={busy}>
            Mentés
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}