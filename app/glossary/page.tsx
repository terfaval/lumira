// /app/glossary/page.tsx
// Client component implementing a personal dream glossary.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { allowGlossaryAccess, GLOSSARY_GATE_THRESHOLD } from "@/src/lib/glossary/gate";

type GlossaryItem = {
  id: string;
  term: string;
  note: string | null;
  created_at: string;
};

type TermCandidate = {
  id: string;
  term: string;
  display_label?: string | null;
  count: number;
  created_at: string;
};

export default function GlossaryPage() {
  const router = useRouter();
  // ensure the user is authenticated; will redirect to login otherwise
  const { loading } = useRequireAuth();

  const [userId, setUserId] = useState<string | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);

  const [items, setItems] = useState<GlossaryItem[]>([]);
  const [suggestions, setSuggestions] = useState<TermCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state for new item
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // modal for adding new items
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState<TermCandidate | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // filtering and sorting state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("created_desc");

  // admin-only: resolve user id and gate to /404
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

  async function loadItems() {
    setBusy(true);
    setErr(null);

    const { data: terms, error: termErr } = await supabase
      .from("glossary_terms")
      .select("id, canonical, created_at")
      .order("created_at", { ascending: false });

    if (termErr) {
      setErr(termErr.message || "Nem sikerült betölteni az álomszótár elemeit.");
      setItems([]);
      setBusy(false);
      return;
    }

    const termRows = (terms ?? []) as Array<{ id: string; canonical: string; created_at: string }>;
    const termIds = termRows.map((t) => t.id);
    const notesByTerm = new Map<string, string>();

    if (termIds.length > 0) {
      const { data: notes, error: noteErr } = await supabase
        .from("glossary_notes")
        .select("term_id, content, created_at")
        .in("term_id", termIds)
        .order("created_at", { ascending: false });

      if (noteErr) {
        setErr(noteErr.message || "Nem sikerült betölteni a jegyzeteket.");
      } else {
        (notes ?? []).forEach((row: any) => {
          if (!notesByTerm.has(row.term_id)) {
            notesByTerm.set(row.term_id, row.content ?? "");
          }
        });
      }
    }

    const mapped: GlossaryItem[] = termRows.map((t) => ({
      id: t.id,
      term: t.canonical,
      note: notesByTerm.get(t.id) ?? null,
      created_at: t.created_at,
    }));

    setItems(mapped);
    setBusy(false);
  }

  async function loadSuggestions() {
    setBusy(true);
    const { data, error } = await supabase
      .from("term_candidates")
      .select("id, term, display_label, count, created_at")
      .order("count", { ascending: false });
    if (error) {
      console.error(error.message);
      setSuggestions([]);
    } else {
      setSuggestions((data as any) ?? []);
    }
    setBusy(false);
  }

  useEffect(() => {
    // only load after admin gate resolved
    if (!loading && adminChecked) {
      void loadItems();
      void loadSuggestions();
    }
  }, [loading, adminChecked]);

  function resetForm() {
    setNewName("");
    setNewNotes("");
  }

  function resetApprovalForm() {
    setApproveTarget(null);
    setApproveNote("");
    setShowApproveModal(false);
  }

  function openApproveModal(candidate: TermCandidate) {
    setApproveTarget(candidate);
    setApproveNote("");
    setShowApproveModal(true);
    setErr(null);
  }

  function showSavedMessage(message: string) {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(null), 2200);
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

  async function onAddItem() {
    setErr(null);
    const name = newName.trim();
    if (!name) {
      setErr("Adj nevet az elemnek.");
      return;
    }
    if (!userId) {
      setErr("Nincs bejelentkezett felhasználó.");
      return;
    }

    setBusy(true);

    const { data: inserted, error } = await supabase
      .from("glossary_terms")
      .insert({ canonical: name, canonical_key: anchorKey(name), user_id: userId })
      .select("id")
      .single();

    if (error) {
      setErr(error.message || "Nem sikerült hozzáadni az elemet.");
    } else {
      const note = newNotes.trim();
      if (note) {
        const { error: noteErr } = await supabase
          .from("glossary_notes")
          .upsert({ term_id: inserted.id, content: note, user_id: userId }, { onConflict: "user_id,term_id" });
        if (noteErr) setErr(noteErr.message || "Nem sikerült elmenteni a jegyzetet.");
      }

      await backfillOccurrences(inserted.id);

      await supabase.from("term_candidates").delete().eq("term", anchorKey(name));
      resetForm();
      await loadItems();
      await loadSuggestions();
    }
    setBusy(false);
  }

  async function onApproveCandidate() {
    if (!approveTarget) return;
    if (!userId) {
      setErr("Nincs bejelentkezett felhasználó.");
      return;
    }

    const name = (approveTarget.display_label || approveTarget.term).trim();
    if (!name) {
      setErr("Adj nevet az elemnek.");
      return;
    }

    setBusy(true);

    const { data: inserted, error } = await supabase
      .from("glossary_terms")
      .insert({ canonical: name, canonical_key: anchorKey(name), user_id: userId })
      .select("id")
      .single();

    if (error) {
      setErr(error.message || "Nem sikerült hozzáadni az elemet.");
      setBusy(false);
      return;
    }

    const note = approveNote.trim();
    if (note) {
      const { error: noteErr } = await supabase
        .from("glossary_notes")
        .upsert({ term_id: inserted.id, content: note, user_id: userId }, { onConflict: "user_id,term_id" });
      if (noteErr) setErr(noteErr.message || "Nem sikerült elmenteni a jegyzetet.");
    }

    await backfillOccurrences(inserted.id);
    await supabase.from("term_candidates").delete().eq("id", approveTarget.id);

    resetApprovalForm();
    showSavedMessage("A bejegyzést elmentettük.");
    await loadItems();
    await loadSuggestions();
    setBusy(false);
  }

  function beginEdit(item: GlossaryItem) {
    setEditingId(item.id);
    setEditName(item.term);
    setEditNotes(item.note ?? "");
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditNotes("");
    setErr(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      setErr("Az elnevezés nem lehet üres.");
      return;
    }
    if (!userId) {
      setErr("Nincs bejelentkezett felhasználó.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("glossary_terms")
      .update({ canonical: name, canonical_key: anchorKey(name) })
      .eq("id", editingId);

    if (error) {
      setErr(error.message || "Nem sikerült frissíteni az elemet.");
      setBusy(false);
      return;
    }

    const note = editNotes.trim();
    if (note) {
      const { error: noteErr } = await supabase
        .from("glossary_notes")
        .upsert({ term_id: editingId, content: note, user_id: userId }, { onConflict: "user_id,term_id" });
      if (noteErr) setErr(noteErr.message || "Nem sikerült elmenteni a jegyzetet.");
    }

    cancelEdit();
    await loadItems();
    await loadSuggestions();
    setBusy(false);
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Biztosan törlöd ezt az elemet?");
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.from("glossary_terms").delete().eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerült törölni az elemet.");
    } else {
      await loadItems();
    }
    setBusy(false);
  }

  // Determine if we should allow access to the glossary until enough recurring elements appear.
  const readyForGate = !loading && !busy;
  const allowGlossary = allowGlossaryAccess(suggestions.length);
  const showOverlay = loading || (busy && items.length === 0 && suggestions.length === 0);

  // derive filtered list based on search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchTerm.trim().length > 0) {
        const term = searchTerm.trim().toLowerCase();
        if (!item.term.toLowerCase().includes(term) && !(item.note ?? "").toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [items, searchTerm]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      switch (sortOption) {
        case "name_asc":
          return a.term.localeCompare(b.term);
        case "name_desc":
          return b.term.localeCompare(a.term);
        case "created_asc":
          return a.created_at.localeCompare(b.created_at);
        case "created_desc":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
    return sorted;
  }, [filteredItems, sortOption]);

  const topCandidates = useMemo(() => {
    return suggestions.slice(0, 4);
  }, [suggestions]);

  // while admin gate is being resolved, render nothing (prevents flicker)
  if (!loading && !adminChecked) {
    return <FullScreenLoadingOverlay open />;
  }

  if (readyForGate && !allowGlossary) {
    return (
      <Shell
        title="Álomszótár"
        space="dream"
        headerActions={null}
        infoOpen={false}
        onToggleInfo={() => {}}
        infoPanel={
          <div className="stack-tight">
            <p className="section-title">Álomszótár</p>
            <p style={{ color: "var(--text-muted)" }}>
              Az álomszótár akkor válik elérhetővé, ha legalább tíz olyan elem ismétlődött az álmaidban,
              amelyhez jegyzeteket írhatsz.
            </p>
          </div>
        }
      >
        <FullScreenLoadingOverlay open={showOverlay} />
        <div className="stack" style={{ width: "100%" }}>
          {err ? (
            <div style={{ color: "crimson" }} role="alert">
              {err}
            </div>
          ) : null}

          {!busy ? (
            <p style={{ color: "var(--text-muted)" }}>
              Jelenleg {suggestions.length} javasolt elem található. Legalább {GLOSSARY_GATE_THRESHOLD} elem szükséges az álomszótár
              megnyitásához.
            </p>
          ) : null}
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title="Álomszótár"
      space="dream"
      headerActions={
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          Új elem
        </button>
      }
      infoOpen={false}
      onToggleInfo={() => {}}
      infoPanel={
        <div className="stack-tight">
          <p className="section-title">Álomszótár</p>
          <p style={{ color: "var(--text-muted)" }}>
            Itt tárolhatod az ismétlődő szereplőket, helyszíneket vagy motívumokat, és jegyzeteket
            írhatsz hozzájuk.
          </p>
        </div>
      }
    >
      <FullScreenLoadingOverlay open={showOverlay} />
      <div className="stack" style={{ width: "100%" }}>
        {saveMessage ? (
          <div style={{ color: "var(--text-muted)" }} role="status">
            {saveMessage}
          </div>
        ) : null}
        {err && (
          <div style={{ color: "crimson" }} role="alert">
            {err}
          </div>
        )}

        <div className="glossary-block">
          <div className="glossary-block-header">
            <div className="glossary-block-title">Ajánlott elemek</div>
          </div>
          <div className="glossary-suggestions-grid">
            <GlassCardSurface className="glossary-suggestion-card glossary-suggestion-card--ghost" variant="flat" paper="evening">
              <div className="glossary-suggestion-content">
                <div style={{ fontWeight: 700 }}>További javaslatok</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Összes jelölt áttekintése.</div>
              </div>
              <div className="glossary-card-footer">
                <Link href="/glossary/suggestions" className="btn btn-secondary">
                  Megnyitás
                </Link>
              </div>
            </GlassCardSurface>

            {topCandidates.map((candidate) => (
              <GlassCardSurface key={candidate.id} className="glossary-suggestion-card" variant="flat" paper="evening">
                <div className="glossary-suggestion-content">
                  <div style={{ fontWeight: 700 }}>{candidate.display_label || candidate.term}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Előfordulás: {candidate.count}
                  </div>
                </div>
                <div className="glossary-card-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => openApproveModal(candidate)} disabled={busy}>
                    Jóváhagyás
                  </button>
                </div>
              </GlassCardSurface>
            ))}
          </div>
        </div>

        <div className="glossary-block">
          <div className="glossary-block-header">
            <div className="glossary-block-title">Rögzített elemek</div>
          </div>

        <div className="glossary-filters">
          <input
            type="text"
            placeholder="Keresés név vagy jegyzet alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ flex: "1 1 200px", minWidth: 200 }}
            disabled={busy}
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="input"
            style={{ flex: "0 0 200px" }}
            disabled={busy}
          >
            <option value="created_desc">Újak elöl</option>
            <option value="created_asc">Régiek elöl</option>
            <option value="name_asc">Név (A–Z)</option>
            <option value="name_desc">Név (Z–A)</option>
          </select>
        </div>

        {sortedItems.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nincs elem, amely megfelel a szűrésnek.</p>
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
            {sortedItems.map((item) =>
              editingId === item.id ? (
                <li key={item.id}>
                  <GlassCardSurface
                    className="glossary-grid-card"
                    style={{ padding: "var(--space-3)" }}
                    variant="flat"
                    paper="evening"
                  >
                    <div className="glossary-card-body stack">
                      <label>
                        <span>Név</span>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input"
                          disabled={busy}
                        />
                      </label>
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
                      <PrimaryButton onClick={saveEdit} disabled={busy || editName.trim().length === 0}>
                        Mentés
                      </PrimaryButton>
                    </div>
                  </GlassCardSurface>
                </li>
              ) : (
                <li key={item.id}>
                  <GlassCardSurface
                    className="glossary-grid-card"
                    style={{ padding: "var(--space-3)" }}
                    variant="flat"
                    paper="evening"
                  >
                    <div className="glossary-card-body stack-tight">
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{item.term}</div>
                      {item.note ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.note}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Nincs jegyzet</div>
                      )}
                    </div>
                    <div className="glossary-card-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => beginEdit(item)} disabled={busy}>
                        Szerkesztés
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => onDelete(item.id)} disabled={busy}>
                        Törlés
                      </button>
                    </div>
                  </GlassCardSurface>
                </li>
              )
            )}
          </ul>
        )}

        </div>
      </div>

      {showAddModal ? (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <GlassCardSurface variant="soft" paper="evening" className="stack">
              <div style={{ fontWeight: 700 }}>Új elem</div>
              <GlassCardMatte padding="sm" tone="evening">
                <input
                  className="input"
                  placeholder="Név"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={busy}
                />
              </GlassCardMatte>
              <GlassCardMatte padding="sm" tone="evening">
                <textarea
                  className="textarea"
                  placeholder="Jegyzet (opcionális)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={4}
                  disabled={busy}
                />
              </GlassCardMatte>
              <div className="glossary-card-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={busy}>
                  Mégse
                </button>
                <PrimaryButton onClick={onAddItem} disabled={busy || newName.trim().length === 0}>
                  Hozzáadás
                </PrimaryButton>
              </div>
            </GlassCardSurface>
          </div>
        </div>
      ) : null}

      {showApproveModal && approveTarget ? (
        <div className="modal-overlay" onClick={resetApprovalForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <GlassCardSurface variant="soft" paper="evening" className="stack">
              <div style={{ fontWeight: 700 }}>Jóváhagyás</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {approveTarget.display_label || approveTarget.term}
              </div>
              <GlassCardMatte padding="sm" tone="evening">
                <textarea
                  className="textarea"
                  placeholder="Jegyzet (opcionális)"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  rows={4}
                  disabled={busy}
                />
              </GlassCardMatte>
              <div className="glossary-card-footer">
                <button type="button" className="btn btn-secondary" onClick={resetApprovalForm} disabled={busy}>
                  Mégse
                </button>
                <PrimaryButton onClick={onApproveCandidate} disabled={busy}>
                  Jóváhagyás
                </PrimaryButton>
              </div>
            </GlassCardSurface>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .glossary-block {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .glossary-block-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .glossary-block-title {
          font-size: 18px;
          font-weight: 700;
        }

        .glossary-suggestions-grid {
          display: grid;
          gap: var(--space-3);
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .glossary-suggestion-card {
          padding: var(--space-3);
          min-height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .glossary-suggestion-card--ghost {
          background: transparent;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          box-shadow: none;
        }

        .glossary-suggestion-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .glossary-filters {
          margin-top: 12px;
          margin-bottom: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(12, 14, 20, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

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

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 70;
        }

        .modal-card {
          width: min(520px, 100%);
        }

        @media (max-width: 1100px) {
          .glossary-suggestions-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .glossary-suggestions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Shell>
  );
}
