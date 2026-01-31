// /app/admin/dreammap/backfill/page.tsx
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

type BackfillResultRow = {
  session_id: string;
  action: "built" | "skipped" | "failed";
  dream_map_version_id?: string | null;
  reason?: string;
};

type BackfillResponse = {
  status?: string;
  scanned?: number;
  built?: number;
  skipped?: number;
  failures?: number;
  next_cursor?: string | null;
  results?: BackfillResultRow[];
  error?: string;
};

export default function DreamMapBackfillAdminPage() {
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [adminChecked, setAdminChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BackfillResponse | null>(null);

  const [limit, setLimit] = useState("25");
  const [cursor, setCursor] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [algoVersion, setAlgoVersion] = useState("dream_map_v0.2");

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

      setAdminChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, router]);

  const canRun = useMemo(() => !busy && adminChecked, [busy, adminChecked]);

  async function runBackfill() {
    if (!canRun) return;
    setBusy(true);
    setErr(null);

    const body: Record<string, any> = {};
    const limitTrim = limit.trim();
    if (limitTrim.length > 0) {
      const parsed = Number(limitTrim);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setErr("A limit mező csak pozitív szám lehet.");
        setBusy(false);
        return;
      }
      body.limit = Math.floor(parsed);
    }

    const cursorTrim = cursor.trim();
    if (cursorTrim.length > 0) body.cursor = cursorTrim;
    if (dryRun) body.dry_run = true;
    if (!onlyMissing) body.only_missing = false;

    const algoTrim = algoVersion.trim();
    if (algoTrim.length > 0) body.algo_version = algoTrim;

    try {
      const res = await fetch("/api/admin/dreammap/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : "{}",
      });

      const payload = (await res.json().catch(() => ({}))) as BackfillResponse;
      if (!res.ok) {
        setErr(payload?.error ?? res.statusText);
        setResult(null);
        setBusy(false);
        return;
      }

      setResult(payload);
    } catch (e: any) {
      setErr(e?.message ?? "Ismeretlen hiba");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  const showOverlay = loading || (busy && !result);

  if (!loading && !adminChecked) {
    return <FullScreenLoadingOverlay open />;
  }

  return (
    <Shell title="Dream map backfill" space="dream" headerActions={null} infoOpen={false} onToggleInfo={() => {}}>
      <FullScreenLoadingOverlay open={showOverlay} />
      <div className="stack" style={{ width: "100%" }}>
        {err && (
          <div style={{ color: "crimson" }} role="alert">
            {err}
          </div>
        )}

        <GlassCardSurface className="stack" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
          <div className="stack-tight">
            <p className="section-title">Kezelés</p>
            <p style={{ color: "var(--text-muted)" }}>
              Admin backfill a meglévő sessionökre. Alapértelmezetten csak a hiányzó dream map-eket
              tölti fel.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-2)",
            }}
          >
            <label className="stack-tight">
              <span>Limit</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="input"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={busy}
              />
            </label>

            <label className="stack-tight">
              <span>Algo verzió</span>
              <input
                type="text"
                className="input"
                value={algoVersion}
                onChange={(e) => setAlgoVersion(e.target.value)}
                disabled={busy}
                placeholder="dream_map_v0.2"
              />
            </label>

            <label className="stack-tight" style={{ gridColumn: "1 / -1" }}>
              <span>Cursor</span>
              <input
                type="text"
                className="input"
                value={cursor}
                onChange={(e) => setCursor(e.target.value)}
                disabled={busy}
                placeholder="base64 vagy created_at|id"
              />
            </label>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={onlyMissing} onChange={() => setOnlyMissing(!onlyMissing)} />
              <span>Csak hiányzó</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={dryRun} onChange={() => setDryRun(!dryRun)} />
              <span>Dry run</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={runBackfill} disabled={!canRun}>
              {busy ? "Fut..." : "Backfill indítása"}
            </PrimaryButton>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setResult(null);
                setErr(null);
              }}
              disabled={busy}
            >
              Eredmény törlése
            </button>
          </div>
        </GlassCardSurface>

        {result && (
          <GlassCardSurface className="stack" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
            <div className="stack-tight">
              <p className="section-title">Eredmény</p>
              <p style={{ color: "var(--text-muted)" }}>
                Szkennelt: {result.scanned ?? 0} · Built: {result.built ?? 0} · Skipped:{" "}
                {result.skipped ?? 0} · Failures: {result.failures ?? 0}
              </p>
            </div>

            <div className="stack-tight">
              <span style={{ color: "var(--text-muted)" }}>Következő cursor</span>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <code style={{ wordBreak: "break-all" }}>{result.next_cursor ?? "nincs"}</code>
                {result.next_cursor && (
                  <button type="button" className="btn btn-secondary" onClick={() => setCursor(result.next_cursor ?? "")}>
                    Cursor beállítása
                  </button>
                )}
              </div>
            </div>

            {result.results && result.results.length > 0 ? (
              <div className="stack-tight">
                <span style={{ color: "var(--text-muted)" }}>Utolsó futás részletei</span>
                <div style={{ display: "grid", gap: 10 }}>
                  {result.results.map((row) => (
                    <div
                      key={row.session_id}
                      style={{
                        display: "grid",
                        gap: 6,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid var(--card-border)",
                        background: "var(--card-inner)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <strong>{row.session_id}</strong>
                        <span style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                          {row.action}
                        </span>
                      </div>
                      {row.dream_map_version_id && (
                        <div style={{ color: "var(--text-muted)" }}>version: {row.dream_map_version_id}</div>
                      )}
                      {row.reason && <div style={{ color: "var(--text-muted)" }}>ok: {row.reason}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>Nincs részletes eredmény.</p>
            )}
          </GlassCardSurface>
        )}
      </div>
    </Shell>
  );
}
