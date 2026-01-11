// /app/glossary/suggestions/page.tsx
// Client component to list and process suggested glossary entries.  These entries are automatically generated
// when an element appears in multiple dreams, but remain in a suggested state until the user writes a note.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

type GlossaryItem = {
  id: string;
  user_id: string;
  name: string;
  categories: string[] | null;
  notes: string | null;
  is_nightmare: boolean;
  is_suggested?: boolean;
  created_at: string;
  updated_at: string;
};

export default function SuggestionsPage() {
  // require authentication – will redirect to login if not logged in
  const { loading } = useRequireAuth();
  const [items, setItems] = useState<GlossaryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filter and search state
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // editing state for individual items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategories, setEditCategories] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editNightmare, setEditNightmare] = useState(false);

  useEffect(() => {
    if (!loading) {
      void loadSuggestions();
    }
  }, [loading]);

  async function loadSuggestions() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("dream_glossary_items")
      .select("*")
      .eq("is_suggested", true)
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message || "Nem sikerült betölteni a javasolt elemeket.");
      setItems([]);
    } else {
      setItems((data as any) ?? []);
    }
    setBusy(false);
  }

  // compute unique categories for filter options
  const uniqueCategories = Array.from(
    new Set(
      items
        .flatMap((item) => item.categories ?? [])
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  // derive filtered list based on search and category filter
  const filteredItems = items.filter((item) => {
    if (filterCategory !== "all") {
      if (!item.categories || !item.categories.includes(filterCategory)) {
        return false;
      }
    }
    if (searchTerm.trim().length > 0) {
      const term = searchTerm.trim().toLowerCase();
      if (!item.name.toLowerCase().includes(term) && !(item.notes ?? '').toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  function beginEdit(item: GlossaryItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategories((item.categories ?? []).join(", "));
    setEditNotes(item.notes ?? "");
    setEditNightmare(item.is_nightmare);
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCategories("");
    setEditNotes("");
    setEditNightmare(false);
    setErr(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      setErr("Az elnevezés nem lehet üres.");
      return;
    }
    setBusy(true);
    const cats = editCategories
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const { error } = await supabase
      .from("dream_glossary_items")
      .update({
        name,
        categories: cats,
        notes: editNotes.trim(),
        is_nightmare: editNightmare,
        is_suggested: false,
      })
      .eq("id", editingId);
    if (error) {
      setErr(error.message || "Nem sikerült frissíteni az elemet.");
    } else {
      cancelEdit();
      await loadSuggestions();
    }
    setBusy(false);
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Biztosan törlöd ezt a javaslatot?");
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.from("dream_glossary_items").delete().eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerült törölni a javaslatot.");
    } else {
      await loadSuggestions();
    }
    setBusy(false);
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
            Ezek azok a fogalmak, amelyek legalább három álmodban megjelentek, de még nem írtál hozzájuk jegyzetet. Kitöltésükkel
            véglegesen rögzítheted őket az álomszótáradban, vagy elutasíthatod őket, ha nem relevánsak.
          </p>
        </div>
      }
    >
      <div className="stack" style={{ width: "100%" }}>
        {err && (
          <div style={{ color: "crimson" }} role="alert">
            {err}
          </div>
        )}
        {/* Filter and search controls */}
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
            placeholder="Keresés név vagy jegyzet alapján…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ flex: "1 1 200px", minWidth: 200 }}
            disabled={busy}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input"
            style={{ flex: "0 0 200px" }}
            disabled={busy}
          >
            <option value="all">Minden kategória</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        {busy && items.length === 0 ? (
          <div>Betöltés…</div>
        ) : filteredItems.length === 0 ? (
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
                <li key={item.id} className="card" style={{ padding: "var(--space-3)" }}>
                  <div className="stack">
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
                      <span>Kategóriák (vesszővel elválasztva)</span>
                      <input
                        type="text"
                        value={editCategories}
                        onChange={(e) => setEditCategories(e.target.value)}
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
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={editNightmare}
                        onChange={(e) => setEditNightmare(e.target.checked)}
                        disabled={busy}
                      />
                      <span>Rémálom elem</span>
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={cancelEdit}
                        disabled={busy}
                      >
                        Mégse
                      </button>
                      <PrimaryButton
                        onClick={saveEdit}
                        disabled={busy || editName.trim().length === 0}
                      >
                        Mentés
                      </PrimaryButton>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={item.id} className="card" style={{ padding: "var(--space-3)" }}>
                  <div className="stack-tight">
                    <div
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{item.name}</div>
                      {item.is_nightmare ? (
                        <span
                          style={{
                            background: "var(--status-erintett-bg)",
                            color: "var(--status-erintett)",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          Rémálom
                        </span>
                      ) : null}
                    </div>
                    {item.categories && item.categories.length > 0 && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Kategóriák: {item.categories.join(", ")}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--status-warning)" }}>Jegyzet hiányzik</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => beginEdit(item)}
                        disabled={busy}
                      >
                        Jegyzet hozzáadása
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onDelete(item.id)}
                        disabled={busy}
                      >
                        Elutasítás
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
        <div style={{ marginTop: 24 }}>
          <Link href="/glossary" legacyBehavior>
            <a className="btn btn-secondary">Vissza az álomszótárhoz</a>
          </Link>
        </div>
      </div>
    </Shell>
  );
}