// /app/glossary/page.tsx
// Client component implementing a personal dream glossary.
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

export default function GlossaryPage() {
  // ensure the user is authenticated; will redirect to login otherwise
  const { loading } = useRequireAuth();

  const [items, setItems] = useState<GlossaryItem[]>([]);
  const [suggestions, setSuggestions] = useState<GlossaryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state for new item
  const [newName, setNewName] = useState("");
  const [newCategories, setNewCategories] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newNightmare, setNewNightmare] = useState(false);

  // editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategories, setEditCategories] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editNightmare, setEditNightmare] = useState(false);

  // modal for adding new items
  const [showAddModal, setShowAddModal] = useState(false);

  // Predefined category options for new entries. These can be extended later.
  const CATEGORY_OPTIONS = [
    "Szereplő",
    "Helyszín",
    "Tárgy",
    "Érzelem",
    "Elem",
    "Hang",
    "Cselekvés",
    "Időjárás",
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>("");

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  }

  function addCustomCategory() {
    const cat = customCategoryInput.trim();
    if (cat.length > 0 && !selectedCategories.includes(cat)) {
      setSelectedCategories((prev) => [...prev, cat]);
    }
    setCustomCategoryInput("");
  }

  // filtering and sorting state
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("created_desc");

  // derive list of unique categories from items for filtering options
  const uniqueCategories = Array.from(
    new Set(
      items
        .flatMap((item) => item.categories ?? [])
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  // apply search, filter and sorting to items list
  const filteredItems = items
    .filter((item) => {
      // filter by category
      if (filterCategory !== "all") {
        if (!item.categories || !item.categories.includes(filterCategory)) {
          return false;
        }
      }
      // filter by search term
      if (searchTerm.trim().length > 0) {
        const term = searchTerm.trim().toLowerCase();
        if (!item.name.toLowerCase().includes(term) && !(item.notes ?? '').toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "created_asc":
          return a.created_at.localeCompare(b.created_at);
        case "created_desc":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

  async function loadItems() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("dream_glossary_items")
      .select("*")
      .eq("is_suggested", false)
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message || "Nem sikerült betölteni az álomszótár elemeit.");
      setItems([]);
    } else {
      setItems((data as any) ?? []);
    }
    setBusy(false);
  }

  async function loadSuggestions() {
    // Fetch items marked as suggestions (no note yet)
    setBusy(true);
    const { data, error } = await supabase
      .from("dream_glossary_items")
      .select("*")
      .eq("is_suggested", true)
      .order("created_at", { ascending: false });
    if (error) {
      // suggestions fetch error is non-fatal; show error message separately
      // but don't overwrite global error if one exists
      console.error(error.message);
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
    setNewCategories("");
    setNewNotes("");
    setNewNightmare(false);
    setSelectedCategories([]);
    setCustomCategoryInput("");
  }

  async function onAddItem() {
    setErr(null);
    const name = newName.trim();
    if (!name) {
      setErr("Adj nevet az elemnek.");
      return;
    }
    setBusy(true);
    // Combine selected categories and any additional comma-separated categories typed by the user.
    const extraCats = customCategoryInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const cats = Array.from(new Set([...selectedCategories, ...extraCats]));
    const { error } = await supabase.from("dream_glossary_items").insert({
      name,
      categories: cats,
      notes: newNotes.trim(),
      is_nightmare: newNightmare,
      is_suggested: false,
    });
    if (error) {
      setErr(error.message || "Nem sikerült hozzáadni az elemet.");
    } else {
      resetForm();
      await loadItems();
      await loadSuggestions();
    }
    setBusy(false);
  }

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
      await loadItems();
      await loadSuggestions();
    }
    setBusy(false);
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Biztosan törlöd ezt az elemet?");
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.from("dream_glossary_items").delete().eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerült törölni az elemet.");
    } else {
      await loadItems();
    }
    setBusy(false);
  }

  // Determine if we should allow access to the glossary. If there are fewer than 10 suggested items,
  // the glossary is hidden until more recurring elements appear.
  const readyForGate = !loading && !busy;
  const allowGlossary = suggestions.length >= 10;

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
              Az álomszótár akkor válik elérhetővé, ha már legalább tíz olyan elem ismétlődött az álmaidban,
              amelyhez jegyzeteket írhatsz. Rögzítsd tovább az álmaidat, hogy össze tudjuk gyűjteni a
              visszatérő szereplőket, helyszíneket vagy motívumokat!
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
          {busy ? (
            <div>Betöltés…</div>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>
              Jelenleg {suggestions.length} javasolt elem található. Legalább 10 elem szükséges az álomszótár
              megnyitásához.
            </p>
          )}
        </div>
      </Shell>
    );
  }

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
            Itt személyre szabott elemeket rögzíthetsz – visszatérő szereplőket, helyszíneket, tárgyakat vagy érzéseket. Ezek segítenek
            később felismerni a mintákat az álmaidban. A kategóriákat vesszővel válaszd el, a jegyzet szabad szöveg.
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

        {/* Javasolt elemek szekció */}
        <div className="stack-tight">
          <h2 style={{ margin: 0, fontSize: 20 }}>Javasolt elemek</h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "var(--space-3)",
              gridTemplateColumns: "repeat(4, 1fr)",
            }}
          >
            {/* CTA card to add new entry */}
            <li
              className="card"
              style={{
                padding: "var(--space-3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setShowAddModal(true)}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1 }}>+</span>
                <span style={{ fontWeight: 500 }}>Jegyzet hozzáadása</span>
              </div>
            </li>
            {/* Show up to three suggestion cards next to the CTA */}
            {suggestions.slice(0, 3).map((sugg) => (
              <li
                key={sugg.id}
                className="card"
                style={{ padding: "var(--space-3)" }}
              >
                <div className="stack-tight">
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{sugg.name}</div>
                  {sugg.categories && sugg.categories.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Kategóriák: {sugg.categories.join(", ")}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--status-warning)" }}>Jegyzet hiányzik</div>
                  <Link href="/glossary/suggestions" legacyBehavior>
                    <a className="btn btn-secondary" style={{ marginTop: 8 }}>Jegyzet hozzáadása</a>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {/* If there are no suggestions, show a note below the grid */}
          {suggestions.length === 0 && (
            <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
              Nincs olyan elem, ami elégszer ismétlődött volna.
            </p>
          )}
          {/* CTA button to full list if more than 3 suggestions */}
          {suggestions.length > 3 && (
            <div style={{ marginTop: 8 }}>
              <Link href="/glossary/suggestions" legacyBehavior>
                <a>
                  <PrimaryButton>Összes javasolt elem</PrimaryButton>
                </a>
              </Link>
            </div>
          )}
        </div>


        {/* Rögzített elemek */}
        <div className="stack" style={{ marginTop: 32 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Rögzített elemek</h2>
          {/* Filter and sort controls */}
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
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="input"
              style={{ flex: "0 0 200px" }}
              disabled={busy}
            >
              <option value="created_desc">Dátum – legújabb elöl</option>
              <option value="created_asc">Dátum – legrégebbi elöl</option>
              <option value="name_asc">Név – A-Z</option>
              <option value="name_desc">Név – Z-A</option>
            </select>
          </div>
          {busy && items.length === 0 ? (
            <div>Betöltés…</div>
          ) : filteredItems.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Nincs olyan elem, amely megfelel a szűrésnek.</p>
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                      {item.notes && (
                        <div
                          style={{ fontSize: 14, marginTop: 8, whiteSpace: "pre-wrap" }}
                        >
                          {item.notes}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => beginEdit(item)}
                          disabled={busy}
                        >
                          Szerkesztés
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onDelete(item.id)}
                          disabled={busy}
                        >
                          Törlés
                        </button>
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>
        {/* Add New Item modal overlay */}
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: "10vh",
            }}
          >
            <div
              className="card"
              style={{
                width: "100%",
                maxWidth: 600,
                background: "var(--surface)",
                padding: "var(--space-4)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Új elem hozzáadása</h2>
              <div className="stack">
                <label>
                  <span>Név</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input"
                    disabled={busy}
                  />
                </label>
                <div>
                  <span>Kategóriák</span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  >
                    {CATEGORY_OPTIONS.map((cat, idx) => {
                      const selected = selectedCategories.includes(cat);
                      // assign a pastel color for each category
                      const palette = [
                        "#FFCDD2",
                        "#F8BBD0",
                        "#E1BEE7",
                        "#D1C4E9",
                        "#C5CAE9",
                        "#BBDEFB",
                        "#B3E5FC",
                        "#B2EBF2",
                      ];
                      const color = palette[idx % palette.length];
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 9999,
                            border: "1px solid var(--border)",
                            background: selected ? color : "var(--surface-muted)",
                            color: selected ? "var(--text)" : "var(--text-muted)",
                            cursor: "pointer",
                          }}
                          disabled={busy}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input
                      type="text"
                      placeholder="Új kategória..."
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="input"
                      disabled={busy}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomCategory();
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => addCustomCategory()}
                      disabled={busy || customCategoryInput.trim().length === 0}
                    >
                      Hozzáad
                    </button>
                  </div>
                </div>
                <label>
                  <span>Jegyzet</span>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="textarea"
                    rows={4}
                    disabled={busy}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={newNightmare}
                    onChange={(e) => setNewNightmare(e.target.checked)}
                    disabled={busy}
                  />
                  <span>Rémálom elem</span>
                </label>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      resetForm();
                      setShowAddModal(false);
                    }}
                    disabled={busy}
                  >
                    Mégse
                  </button>
                  <PrimaryButton
                    onClick={async () => {
                      await onAddItem();
                      // close modal only if add succeeded and no error
                      if (!err) {
                        setShowAddModal(false);
                        resetForm();
                      }
                    }}
                    disabled={busy || newName.trim().length === 0}
                  >
                    Mentés
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </Shell>
  );
}