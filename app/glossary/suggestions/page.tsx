// /app/glossary/suggestions/page.tsx
// Client component for managing suggested dream glossary items.
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

export default function GlossarySuggestionsPage() {
  // ensure the user is authenticated; will redirect to login otherwise
  const { loading } = useRequireAuth();

  const [suggestions, setSuggestions] = useState<GlossaryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state per suggestion id
  const [formState, setFormState] = useState<Record<string, { categories: string; notes: string }>>({});

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  async function loadSuggestions() {
    setBusy(true);
    const { data, error } = await supabase
      .from("dream_glossary_items")
      .select("*")
      .eq("is_suggested", true)
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message || "Nem sikerült betölteni a javasolt elemeket.");
      setSuggestions([]);
    } else {
      const items: GlossaryItem[] = (data as any) ?? [];
      setSuggestions(items);
      // initialize form state for each suggestion if not already set
      setFormState((prev) => {
        const newState = { ...prev };
        items.forEach((item) => {
          if (!newState[item.id]) {
            newState[item.id] = {
              categories: (item.categories ?? []).join(", "),
              notes: item.notes ?? "",
            };
          }
        });
        return newState;
      });
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!loading) {
      void loadSuggestions();
    }
  }, [loading]);

  // derive unique categories for filtering
  const uniqueCategories = Array.from(
    new Set(
      suggestions
        .flatMap((item) => item.categories ?? [])
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  // apply search and filter
  const filteredSuggestions = suggestions.filter((item) => {
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

  function handleFieldChange(id: string, field: "categories" | "notes", value: string) {
    setFormState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveSuggestion(id: string) {
    const state = formState[id];
    if (!state) return;
    const name = suggestions.find((s) => s.id === id)?.name ?? "";
    const cats = state.categories
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const notes = state.notes.trim();
    if (notes.length === 0) {
      alert("Kérjük, írj egy jegyzetet, mielőtt elmentenéd.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("dream_glossary_items")
      .update({
        name,
        categories: cats,
        notes,
        is_suggested: false,
      })
      .eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerült menteni a javasolt elemet.");
    } else {
      // remove from suggestions list
      setSuggestions((prev) => prev.filter((item) => item.id !== id));
      // remove form state
      setFormState((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
    setBusy(false);
  }

  async function dismissSuggestion(id: string) {
    const confirmed = window.confirm("Biztosan elutasítod ezt a javaslatot? A törlés végleges.");
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.from("dream_glossary_items").delete().eq("id", id);
    if (error) {
      setErr(error.message || "Nem sikerült törölni a javasolt elemet.");
    } else {
      setSuggestions((prev) => prev.filter((item) => item.id !== id));
      setFormState((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
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
          <p className="section-title">Javasolt álomszótár</p>
          <p style={{ color: "var(--text-muted)" }}>
            Ezek azok az elemek, amelyek több álomban is előfordultak, de még nincs hozzájuk jegyzeted. Adj megjegyzést, hogy a
            szótárad részévé váljanak, vagy utasítsd el őket.
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
        {/* Filter controls */}
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
        {busy && suggestions.length === 0 ? (
          <div>Betöltés…</div>
        ) : filteredSuggestions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            Nincs olyan javasolt elem, amely megfelel a szűrésnek.
          </p>
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
            {filteredSuggestions.map((item) => (
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
                  {/* Categories editing */}
                  <label>
                    <span>Kategóriák (vesszővel elválasztva)</span>
                    <input
                      type="text"
                      value={formState[item.id]?.categories ?? ''}
                      onChange={(e) => handleFieldChange(item.id, 'categories', e.target.value)}
                      className="input"
                      disabled={busy}
                    />
                  </label>
                  {/* Notes editing */}
                  <label>
                    <span>Jegyzet</span>
                    <textarea
                      value={formState[item.id]?.notes ?? ''}
                      onChange={(e) => handleFieldChange(item.id, 'notes', e.target.value)}
                      className="textarea"
                      rows={4}
                      disabled={busy}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => dismissSuggestion(item.id)}
                      disabled={busy}
                    >
                      Elutasítás
                    </button>
                    <PrimaryButton
                      onClick={() => saveSuggestion(item.id)}
                      disabled={busy}
                    >
                      Mentés a szótárba
                    </PrimaryButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* Link back to main glossary */}
        <div style={{ marginTop: 24 }}>
          <Link href="/glossary" legacyBehavior>
            <a className="btn btn-secondary">Vissza az álomszótárhoz</a>
          </Link>
        </div>
      </div>
    </Shell>
  );
}