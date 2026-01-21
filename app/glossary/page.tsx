// /app/glossary/page.tsx
// Client component implementing a personal dream glossary.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

type GlossaryItem = {
  id: string;
  term: string;
  note: string | null;
  created_at: string;
};

type TermCandidate = {
  id: string;
  term: string;
  count: number;
  created_at: string;
};

export default function GlossaryPage() {
  // ensure the user is authenticated; will redirect to login otherwise
  const { loading } = useRequireAuth();

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

  // filtering and sorting state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("created_desc");

  async function loadItems() {
    setBusy(true);
    setErr(null);

    const { data: terms, error: termErr } = await supabase
      .from("glossary_terms")
      .select("id, canonical, created_at")
      .order("created_at", { ascending: false });

    if (termErr) {
      setErr(termErr.message || "Could not load glossary terms.");
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
        setErr(noteErr.message || "Could not load glossary notes.");
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
      .select("id, term, count, created_at")
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
    if (!loading) {
      void loadItems();
      void loadSuggestions();
    }
  }, [loading]);

  function resetForm() {
    setNewName("");
    setNewNotes("");
  }

  async function onAddItem() {
    setErr(null);
    const name = newName.trim();
    if (!name) {
      setErr("Adj nevet az elemnek.");
      return;
    }
    setBusy(true);

    const { data: inserted, error } = await supabase
      .from("glossary_terms")
      .insert({ canonical: name })
      .select("id")
      .single();

    if (error) {
      setErr(error.message || "Nem sikerult hozzaadni az elemet.");
    } else {
      const note = newNotes.trim();
      if (note) {
        const { error: noteErr } = await supabase
          .from("glossary_notes")
          .insert({ term_id: inserted.id, content: note });
        if (noteErr) setErr(noteErr.message || "Nem sikerult elmenteni a jegyzetet.");
      }

      await supabase.from("term_candidates").delete().eq("term", name);
      resetForm();
      await loadItems();
      await loadSuggestions();
    }
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
      setErr("Az elnevezes nem lehet ures.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("glossary_terms")
      .update({ canonical: name })
      .eq("id", editingId);

    if (error) {
      setErr(error.message || "Nem sikerult frissiteni az elemet.");
      setBusy(false);
      return;
    }

    const note = editNotes.trim();
    if (note) {
      const { error: noteErr } = await supabase
        .from("glossary_notes")
        .insert({ term_id: editingId, content: note });
      if (noteErr) setErr(noteErr.message || "Nem sikerult elmenteni a jegyzetet.");
    }

    cancelEdit();
    await loadItems();
    await loadSuggestions();
    setBusy(false);
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Biztosan torlod ezt az elemet?");
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.from("glossary_terms").delete().eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerult torolni az elemet.");
    } else {
      await loadItems();
    }
    setBusy(false);
  }

  // Determine if we should allow access to the glossary. If there are fewer than 10 suggested items,
  // the glossary is hidden until more recurring elements appear.
  const readyForGate = !loading && !busy;
  const allowGlossary = suggestions.length >= 10;
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

  if (readyForGate && !allowGlossary) {
    return (
      <Shell
        title="Alomszotar"
        space="dream"
        headerActions={null}
        infoOpen={false}
        onToggleInfo={() => {}}
        infoPanel={
          <div className="stack-tight">
            <p className="section-title">Alomszotar</p>
            <p style={{ color: "var(--text-muted)" }}>
              Az alomszotar akkor valik elerhetove, ha legalabb tiz olyan elem ism?tlodott
              az almaidban, amelyhez jegyzeteket irhatsz.
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
              Jelenleg {suggestions.length} javasolt elem talalhato. Legalabb 10 elem szukseges az alomszotar
              megnyitasahoz.
            </p>
          ) : null}
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title="Alomszotar"
      space="dream"
      headerActions={
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          Uj elem
        </button>
      }
      infoOpen={false}
      onToggleInfo={() => {}}
      infoPanel={
        <div className="stack-tight">
          <p className="section-title">Alomszotar</p>
          <p style={{ color: "var(--text-muted)" }}>
            Itt tarolhatod az ismetlodo szereploket, helyszineket vagy mot?vumokat, es jegyzeteket
            irhatsz hozz?juk.
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
            placeholder="Kereses nev vagy jegyzet alapjan..."
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
            <option value="created_desc">Ujak elol</option>
            <option value="created_asc">Regiek elol</option>
            <option value="name_asc">Nev (A-Z)</option>
            <option value="name_desc">Nev (Z-A)</option>
          </select>
        </div>

        {sortedItems.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nincs elem, amely megfelel a szuresnek.</p>
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
                  <GlassCardSurface className="glossary-grid-card" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
                    <div className="glossary-card-body stack">
                      <label>
                        <span>Nev</span>
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
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={cancelEdit}
                        disabled={busy}
                      >
                        Megse
                      </button>
                      <PrimaryButton
                        onClick={saveEdit}
                        disabled={busy || editName.trim().length === 0}
                      >
                        Mentes
                      </PrimaryButton>
                    </div>
                  </GlassCardSurface>
                </li>
              ) : (
                <li key={item.id}>
                  <GlassCardSurface className="glossary-grid-card" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
                    <div className="glossary-card-body stack-tight">
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{item.term}</div>
                      {item.note ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.note}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Nincs jegyzet</div>
                      )}
                    </div>
                    <div className="glossary-card-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => beginEdit(item)}
                        disabled={busy}
                      >
                        Szerkesztes
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onDelete(item.id)}
                        disabled={busy}
                      >
                        Torles
                      </button>
                    </div>
                  </GlassCardSurface>
                </li>
              )
            )}
          </ul>
        )}

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/glossary/suggestions" className="btn btn-secondary">
            Javaslatok
          </Link>
        </div>
      </div>

      {showAddModal ? (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <GlassCardSurface variant="soft" paper="evening" className="stack">
              <div style={{ fontWeight: 700 }}>Uj elem</div>
              <GlassCardMatte padding="sm" tone="evening">
                <input
                  className="input"
                  placeholder="Nev"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={busy}
                />
              </GlassCardMatte>
              <GlassCardMatte padding="sm" tone="evening">
                <textarea
                  className="textarea"
                  placeholder="Jegyzet (opcionalis)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={4}
                  disabled={busy}
                />
              </GlassCardMatte>
              <div className="glossary-card-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={busy}
                >
                  Megse
                </button>
                <PrimaryButton onClick={onAddItem} disabled={busy || newName.trim().length === 0}>
                  Hozzaadas
                </PrimaryButton>
              </div>
            </GlassCardSurface>
          </div>
        </div>
      ) : null}

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
      `}</style>
    </Shell>
  );
}
