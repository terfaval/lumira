// /app/glossary/page.tsx
// Client component implementing a personal dream glossary.
"use client";

import { useEffect, useState } from "react";
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
  created_at: string;
  updated_at: string;
};

export default function GlossaryPage() {
  // ensure the user is authenticated; will redirect to login otherwise
  const { loading } = useRequireAuth();

  const [items, setItems] = useState<GlossaryItem[]>([]);
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

  async function loadItems() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("dream_glossary_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message || "Nem sikerült betölteni az álomszótár elemeit.");
      setItems([]);
    } else {
      setItems((data as any) ?? []);
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!loading) {
      void loadItems();
    }
  }, [loading]);

  function resetForm() {
    setNewName("");
    setNewCategories("");
    setNewNotes("");
    setNewNightmare(false);
  }

  async function onAddItem() {
    setErr(null);
    const name = newName.trim();
    if (!name) {
      setErr("Adj nevet az elemnek.");
      return;
    }
    setBusy(true);
    const cats = newCategories
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const { error } = await supabase.from("dream_glossary_items").insert({
      name,
      categories: cats,
      notes: newNotes.trim(),
      is_nightmare: newNightmare,
    });
    if (error) {
      setErr(error.message || "Nem sikerült hozzáadni az elemet.");
    } else {
      resetForm();
      await loadItems();
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
      })
      .eq("id", editingId);
    if (error) {
      setErr(error.message || "Nem sikerült frissíteni az elemet.");
    } else {
      cancelEdit();
      await loadItems();
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
      <div className="stack" style={{ maxWidth: 720 }}>
        {err && (
          <div style={{ color: "crimson" }} role="alert">
            {err}
          </div>
        )}

        {/* Új elem form */}
        <div className="stack-tight">
          <h2 style={{ margin: 0, fontSize: 20 }}>Új elem hozzáadása</h2>
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
            <label>
              <span>Kategóriák (vesszővel elválasztva)</span>
              <input
                type="text"
                value={newCategories}
                onChange={(e) => setNewCategories(e.target.value)}
                className="input"
                disabled={busy}
              />
            </label>
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
            <PrimaryButton
              onClick={onAddItem}
              disabled={busy || newName.trim().length === 0}
            >
              {busy ? "Mentés…" : "Hozzáadás"}
            </PrimaryButton>
          </div>
        </div>

        {/* Lista */}
        <div className="stack" style={{ marginTop: 32 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Rögzített elemek</h2>
          {busy && items.length === 0 ? (
            <div>Betöltés…</div>
          ) : items.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Még nincs felvett elem.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "var(--space-3)" }}>
              {items.map((item) =>
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
                          <span style={{ background: "var(--status-erintett-bg)", color: "var(--status-erintett)", padding: "2px 8px", borderRadius: 6, fontSize: 12 }}>
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
                        <div style={{ fontSize: 14, marginTop: 8, whiteSpace: "pre-wrap" }}>
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
    </Shell>
  );
}