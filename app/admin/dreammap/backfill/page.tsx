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
  target?: "missing_dreammap" | "missing_archetype";
  scanned?: number;
  eligible?: number;
  not_eligible?: number;
  ran?: number;
  built?: number;
  skipped?: number;
  failures?: number;
  errors?: number;
  next_cursor?: string | null;
  next_offset?: number | null;
  error_samples?: Array<{ session_id: string; user_id: string; message: string }>;
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
  const [offset, setOffset] = useState("0");
  const [dryRun, setDryRun] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [algoVersion, setAlgoVersion] = useState("dream_map_v0.4");
  const [target, setTarget] = useState<"missing_dreammap" | "missing_archetype">("missing_dreammap");
  const [scopeMode, setScopeMode] = useState<"all" | "user" | "window">("all");
  const [userId, setUserId] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

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

    if (target === "missing_dreammap") {
      const cursorTrim = cursor.trim();
      if (cursorTrim.length > 0) body.cursor = cursorTrim;
      if (!onlyMissing) body.only_missing = false;
    }
    if (target === "missing_archetype") {
      const offsetTrim = offset.trim();
      if (offsetTrim.length > 0) {
        const parsedOffset = Number(offsetTrim);
        if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
          setErr("Az offset mező csak 0 vagy pozitív szám lehet.");
          setBusy(false);
          return;
        }
        body.offset = Math.floor(parsedOffset);
      }
      body.scope_mode = scopeMode;
      const userIdTrim = userId.trim();
      if (userIdTrim.length > 0) body.user_id = userIdTrim;
      const sinceTrim = since.trim();
      if (sinceTrim.length > 0) body.since = sinceTrim;
      const untilTrim = until.trim();
      if (untilTrim.length > 0) body.until = untilTrim;
    }
    if (dryRun) body.dry_run = true;

    const algoTrim = algoVersion.trim();
    if (algoTrim.length > 0) body.algo_version = algoTrim;
    body.target = target;

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
              <span>Cél</span>
              <select
                className="input"
                value={target}
                onChange={(e) => setTarget(e.target.value as "missing_dreammap" | "missing_archetype")}
                disabled={busy}
              >
                <option value="missing_dreammap">Hiányzó dream map</option>
                <option value="missing_archetype">Hiányzó archetype</option>
              </select>
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

            {target === "missing_dreammap" ? (
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
            ) : (
              <label className="stack-tight" style={{ gridColumn: "1 / -1" }}>
                <span>Offset</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="input"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                  disabled={busy}
                />
              </label>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {target === "missing_dreammap" ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={onlyMissing} onChange={() => setOnlyMissing(!onlyMissing)} />
                <span>Csak hiányzó</span>
              </label>
            ) : (
              <>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>Scope</span>
                  <select
                    className="input"
                    value={scopeMode}
                    onChange={(e) => setScopeMode(e.target.value as "all" | "user" | "window")}
                    disabled={busy}
                  >
                    <option value="all">Minden user</option>
                    <option value="user">Egy user</option>
                    <option value="window">Időablak</option>
                  </select>
                </label>
                {scopeMode !== "all" && (
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span>User ID</span>
                    <input
                      type="text"
                      className="input"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      disabled={busy}
                      placeholder="uuid"
                    />
                  </label>
                )}
                {scopeMode === "window" && (
                  <>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span>Since</span>
                      <input
                        type="text"
                        className="input"
                        value={since}
                        onChange={(e) => setSince(e.target.value)}
                        disabled={busy}
                        placeholder="2026-01-01T00:00:00Z"
                      />
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span>Until</span>
                      <input
                        type="text"
                        className="input"
                        value={until}
                        onChange={(e) => setUntil(e.target.value)}
                        disabled={busy}
                        placeholder="2026-01-31T23:59:59Z"
                      />
                    </label>
                  </>
                )}
              </>
            )}
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
              {result.target === "missing_archetype" ? (
                <p style={{ color: "var(--text-muted)" }}>
                  Szkennelt: {result.scanned ?? 0} · Érintett: {result.eligible ?? 0} · Futott: {result.ran ?? 0} ·
                  Skipped: {result.skipped ?? 0} · Errors: {result.errors ?? 0}
                </p>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>
                  Szkennelt: {result.scanned ?? 0} · Built: {result.built ?? 0} · Skipped:{" "}
                  {result.skipped ?? 0} · Failures: {result.failures ?? 0}
                </p>
              )}
            </div>

            {result.target === "missing_archetype" ? (
              <div className="stack-tight">
                <span style={{ color: "var(--text-muted)" }}>Következő offset</span>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <code style={{ wordBreak: "break-all" }}>
                    {typeof result.next_offset === "number" ? result.next_offset : "nincs"}
                  </code>
                  {typeof result.next_offset === "number" && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setOffset(String(result.next_offset ?? 0))}
                    >
                      Offset beállítása
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="stack-tight">
                <span style={{ color: "var(--text-muted)" }}>Következő cursor</span>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <code style={{ wordBreak: "break-all" }}>{result.next_cursor ?? "nincs"}</code>
                  {result.next_cursor && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCursor(result.next_cursor ?? "")}
                    >
                      Cursor beállítása
                    </button>
                  )}
                </div>
              </div>
            )}

            {result.target === "missing_archetype" ? (
              result.error_samples && result.error_samples.length > 0 ? (
                <div className="stack-tight">
                  <span style={{ color: "var(--text-muted)" }}>Hibaminták</span>
                  <div style={{ display: "grid", gap: 10 }}>
                    {result.error_samples.map((row) => (
                      <div
                        key={`${row.session_id}:${row.user_id}`}
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
                          <span style={{ textTransform: "uppercase", letterSpacing: 1 }}>error</span>
                        </div>
                        <div style={{ color: "var(--text-muted)" }}>user: {row.user_id}</div>
                        <div style={{ color: "var(--text-muted)" }}>ok: {row.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)" }}>Nincs részletes eredmény.</p>
              )
            ) : result.results && result.results.length > 0 ? (
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
