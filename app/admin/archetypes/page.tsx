// /app/admin/archetypes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";

type Row = {
  id: string;
  user_id: string;
  domain: string;
  base_key: string | null;
  canonical_label: string;
  occurrence: number | null;
  suggested_canonical_key: string | null;
  status: string;
  updated_at: string;
  note: string | null;
};

export default function AdminArchetypesPage() {
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [adminChecked, setAdminChecked] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("open");
  const [domain, setDomain] = useState("");
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

      setAdminChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, router]);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      if (domain.trim()) params.set("domain", domain.trim());
      if (userId.trim()) params.set("user_id", userId.trim());
      const res = await fetch(`/api/admin/archetypes/queue?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error ?? res.statusText);
        setRows([]);
        return;
      }
      setRows(Array.isArray(json?.rows) ? json.rows : []);
    } catch (e: any) {
      setErr(e?.message ?? "Ismeretlen hiba");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!adminChecked) return;
    load();
  }, [adminChecked, status, domain, userId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      return (
        String(r.base_key ?? "").toLowerCase().includes(needle) ||
        String(r.canonical_label ?? "").toLowerCase().includes(needle) ||
        String(r.suggested_canonical_key ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q]);

  async function approve(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/archetypes/queue/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setErr(payload?.error ?? res.statusText);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Ismeretlen hiba");
    } finally {
      setBusy(false);
    }
    await load();
  }

  async function reject(id: string) {
    const note = prompt("Reject note (optional):") ?? "";
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/archetypes/queue/${id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: note.trim() ? note.trim() : null }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setErr(payload?.error ?? res.statusText);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Ismeretlen hiba");
    } finally {
      setBusy(false);
    }
    await load();
  }

  async function merge(id: string) {
    const target = prompt("Target canonical_key (existing archetype_terms):") ?? "";
    if (!target.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/archetypes/queue/${id}/merge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target_canonical_key: target.trim() }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setErr(payload?.error ?? res.statusText);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Ismeretlen hiba");
    } finally {
      setBusy(false);
    }
    await load();
  }

  if (!loading && !adminChecked) {
    return <FullScreenLoadingOverlay open />;
  }

  return (
    <Shell title="Archetypes queue" space="dream" headerActions={null} infoOpen={false} onToggleInfo={() => {}}>
      <FullScreenLoadingOverlay open={loading || (busy && rows.length === 0)} />
      <div className="stack" style={{ width: "100%" }}>
        {err && (
          <div style={{ color: "crimson" }} role="alert">
            {err}
          </div>
        )}

        <GlassCardSurface className="stack" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
          <div className="stack-tight">
            <p className="section-title">SzĹ±rĹ‘k</p>
            <p style={{ color: "var(--text-muted)" }}>Queue elemek listĂˇzĂˇsa Ă©s admin mĹ±veletek.</p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-2)",
            }}
          >
            <label className="stack-tight">
              <span>Status</span>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">open (new|pending)</option>
                <option value="new">new</option>
                <option value="approved">approved</option>
                <option value="merged">merged</option>
                <option value="rejected">rejected</option>
                <option value="pending">pending</option>
              </select>
            </label>

            <label className="stack-tight">
              <span>Domain</span>
              <input
                type="text"
                className="input"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="people/places/..."
              />
            </label>

            <label className="stack-tight">
              <span>User id</span>
              <input
                type="text"
                className="input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="optional"
              />
            </label>

            <label className="stack-tight" style={{ gridColumn: "1 / -1" }}>
              <span>Search</span>
              <input
                type="text"
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="base_key / label"
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={load} disabled={busy}>
              {busy ? "Loading..." : "Refresh"}
            </PrimaryButton>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRows([]);
                setErr(null);
              }}
              disabled={busy}
            >
              Lista tĂ¶rlĂ©se
            </button>
          </div>
        </GlassCardSurface>

        <GlassCardSurface className="stack" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
          <div style={{ border: "1px solid var(--card-border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--card-inner)" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Domain</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Base key</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Label</th>
                  <th style={{ textAlign: "right", padding: 10 }}>Occ</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Suggested</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Status</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                    <td style={{ padding: 10 }}>{r.domain}</td>
                    <td style={{ padding: 10, fontFamily: "monospace" }}>{r.base_key}</td>
                    <td style={{ padding: 10 }}>{r.canonical_label}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{r.occurrence ?? 0}</td>
                    <td style={{ padding: 10, fontFamily: "monospace" }}>{r.suggested_canonical_key ?? ""}</td>
                    <td style={{ padding: 10 }}>{r.status}</td>
                    <td style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={() => approve(r.id)} disabled={busy}>
                        Approve
                      </button>
                      <button className="btn btn-secondary" onClick={() => merge(r.id)} disabled={busy}>
                        Merge
                      </button>
                      <button className="btn btn-secondary" onClick={() => reject(r.id)} disabled={busy}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 14, color: "var(--text-muted)" }}>
                      No rows.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </GlassCardSurface>
      </div>
    </Shell>
  );
}
