"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import type { WorkBlock } from "@/src/lib/types";

export default function WorkPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const current = useMemo(() => blocks.find((b) => b.block_state === "open") ?? blocks[0], [blocks]);

  async function load() {
    setErr(null);
    const { data, error } = await supabase
      .from("work_blocks")
      .select("id, session_id, direction_slug, sequence, ai_context, ai_question, user_answer, block_state")
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .order("sequence", { ascending: true });
    if (error) setErr(error.message);
    else setBlocks((data ?? []) as WorkBlock[]);
  }

  useEffect(() => { load(); }, [sessionId]);

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
    } catch (e: any) {
      setErr(e.message ?? "Hiba");
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
    } catch (e: any) {
      setErr(e.message ?? "Hiba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Kártyás feldolgozás">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <PrimaryButton onClick={generateDummyBlock} disabled={busy}>
          + 1 blokk (wireframe stub)
        </PrimaryButton>
        <PrimaryButton onClick={() => router.push(`/session/${sessionId}`)}>
          Összkép
        </PrimaryButton>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {blocks.length === 0 ? (
        <p>Még nincs blokk. Adj hozzá egyet a gombbal.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {blocks.map((b) => (
            <BlockCard key={b.id} block={b} onSave={saveAnswer} busy={busy} />
          ))}
        </div>
      )}

      {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
      {current && <p style={{ marginTop: 12, opacity: 0.7 }}>Aktív blokk: #{current.sequence}</p>}
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

  useEffect(() => setDraft(block.user_answer ?? ""), [block.id]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>
        #{block.sequence} • state: {block.block_state}
      </div>
      <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{block.ai_context}</div>
      <div style={{ marginTop: 8, fontWeight: 700 }}>{block.ai_question}</div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
        placeholder="Válasz (opcionális)"
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <PrimaryButton onClick={() => onSave(block.id, draft)} disabled={busy}>
          Mentés
        </PrimaryButton>
      </div>
    </div>
  );
}
