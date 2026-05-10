// /app/glossary/suggestions/page.tsx
// Client component to list and process suggested glossary entries.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";

type TermCandidate = {
  id: string;
  term: string;
  display_label?: string | null;
  count: number;
  created_at: string;
};

export default function SuggestionsPage() {
  const router = useRouter();
  // require authentication - will redirect to login if not logged in
  const { loading } = useRequireAuth();

  const [userId, setUserId] = useState<string | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);

  const [items, setItems] = useState<TermCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filter and search state
  const [searchTerm, setSearchTerm] = useState<string>("");

  // editing state for individual items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  // admin-only gate
  useEffect(() => {
    if (loading) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      const uid = data?.user?.id ?? null;
      if (error || !uid) {
        router.replace("/404");
        return;
      }
      if (!isGlossaryAdmin(uid)) {
        router.replace("/404");
        return;
      }

      setUserId(uid);
      setAdminChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, router]);

  useEffect(() => {
    if (!loading && adminChecked) {
      const timer = window.setTimeout(() => {
        void loadSuggestions();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [loading, adminChecked]);

  async function loadSuggestions() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("term_candidates")
      .select("id, term, display_label, count, created_at")
      .order("count", { ascending: false });
    if (error) {
      setErr(error.message || "Nem sikerült betölteni a javasolt elemeket.");
      setItems([]);
    } else {
      setItems((data as TermCandidate[] | null) ?? []);
    }
    setBusy(false);
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchTerm.trim().length > 0) {
        const term = searchTerm.trim().toLowerCase();
        if (!item.term.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [items, searchTerm]);

  const showOverlay = loading || (busy && items.length === 0);

  function beginEdit(item: TermCandidate) {
    setEditingId(item.id);
    setEditNotes("");
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNotes("");
    setErr(null);
  }

  async function backfillOccurrences(termId: string) {
    try {
      const res = await fetch("/api/glossary/backfill-occurrences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term_id: termId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.warn("glossary backfill failed", payload?.error ?? res.statusText);
      }
    } catch (e) {
      console.warn("glossary backfill failed", e);
    }
  }

  async function acceptSuggestion(item: TermCandidate) {
    if (!userId) {
      setErr("Nincs bejelentkezett felhasználó.");
      return;
    }

    setBusy(true);
    try {
      const label = (item.display_label ?? item.term).trim();
      const { data: inserted, error } = await supabase
        .from("glossary_terms")
        .insert({ canonical: label, canonical_key: item.term, user_id: userId })
        .select("id")
        .single();
      if (error) throw error;

      const note = editNotes.trim();
      if (note) {
        const { error: noteErr } = await supabase
          .from("glossary_notes")
          .upsert({ term_id: inserted.id, content: note, user_id: userId }, { onConflict: "user_id,term_id" });
        if (noteErr) throw noteErr;
      }

      await backfillOccurrences(inserted.id);

      const { error: delErr } = await supabase.from("term_candidates").delete().eq("id", item.id);
      if (delErr) throw delErr;

      cancelEdit();
      await loadSuggestions();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Nem sikerült frissíteni az elemet.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Biztosan törlöd ezt a javaslatot?");
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.from("term_candidates").delete().eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerült törölni a javaslatot.");
    } else {
      await loadSuggestions();
    }
    setBusy(false);
  }

  // while gate resolves, prevent flicker
  if (!loading && !adminChecked) {
    return <FullScreenLoadingOverlay open />;
  }

  return (
    <Shell
      title="Javasolt elemek"
      space="dream"
      headerActions={null}
      infoOpen={false}
      onToggleInfo={() => {}}
      infoPanel={
        <div className="stack-tight">
          <p className="section-title">Javasolt elemek</p>
          <p style={{ color: "var(--text-muted)" }}>
            Ezek azok a fogalmak, amelyek többször megjelentek, de még nem írtál hozzájuk jegyzetet.
            Elfogadással bekerülnek az álomszótárba.
          </p>
        </div>
      }
    >
      <FullScreenLoadingOverlay open={showOverlay} />
      <div className="stack" style={{ width: "100%" }}>
        {err && (
          <div style={{ color: "crimson" }} role="alert">
            {err}
          </div>
        )}
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Keresés a névben..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ flex: "1 1 200px", minWidth: 200 }}
            disabled={busy}
          />
        </div>

        {filteredItems.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nincs olyan javaslat, amely megfelel a szűrésnek.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "var(--space-3)",
            }}
          >
            {filteredItems.map((item) =>
              editingId === item.id ? (
                <li key={item.id}>
                  <GlassCardSurface className="glossary-grid-card" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
                    <div className="glossary-card-body stack">
                      <div style={{ fontWeight: 700 }}>{item.display_label ?? item.term}</div>
                      <label>
                        <span>Jegyzet</span>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="textarea"
                          rows={4}
                          disabled={busy}
                        />
                      </label>
                    </div>
                    <div className="glossary-card-footer">
                      <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={busy}>
                        Mégse
                      </button>
                      <PrimaryButton onClick={() => acceptSuggestion(item)} disabled={busy}>
                        Elfogadás
                      </PrimaryButton>
                    </div>
                  </GlassCardSurface>
                </li>
              ) : (
                <li key={item.id}>
                  <GlassCardSurface className="glossary-grid-card" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
                    <div className="glossary-card-body stack-tight">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{item.display_label ?? item.term}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>x{item.count}</div>
                      </div>
                    </div>
                    <div className="glossary-card-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => beginEdit(item)} disabled={busy}>
                        Jegyzet hozzáadása
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => onDelete(item.id)} disabled={busy}>
                        Elutasítás
                      </button>
                    </div>
                  </GlassCardSurface>
                </li>
              )
            )}
          </ul>
        )}
        <div style={{ marginTop: 24 }}>
          <Link href="/glossary" className="btn btn-secondary">
            Vissza az álomszótárhoz
          </Link>
        </div>
        <style jsx>{`
          .glossary-grid-card {
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .glossary-card-body {
            flex: 1 1 auto;
          }

          .glossary-card-footer {
            flex: 0 0 auto;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
            margin-top: 12px;
          }
        `}</style>
      </div>
    </Shell>
  );
}
