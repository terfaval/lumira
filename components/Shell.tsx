"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { NapszakInitializer } from "./NapszakInitializer";
import { SidebarDrawer } from "./SidebarDrawer";

export function Shell({
  title,
  children,
  space = "dream",
  headerActions,
  infoPanel,
  infoOpen,
  onToggleInfo,
  surface = "card",
}: {
  title: string;
  children: ReactNode;
  space?: "dream" | "evening";
  headerActions?: ReactNode;
  infoPanel?: ReactNode;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
  surface?: "card" | "none" | "ghost";
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div
      className={`shell shell--fluid ${space === "evening" ? "evening-shell" : ""}`}
      style={{ position: "relative", minWidth: 0, overflowX: "clip" }}
    >
      <NapszakInitializer space={space} />

      {/* Felső sáv */}
      <div className="shell-topbar">
        <button
          type="button"
          aria-label="Menü"
          className="btn btn-secondary"
          onClick={() => setDrawerOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: 12,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="shell-title" style={{ margin: 0 }}>
          {title}
        </h1>

        <div className="shell-topbar-spacer" />

        {headerActions}

        {/* opcionális: ha a headerActions-ben nem rakod bele, itt is lehetne info gomb;
            most csak a struktúrát tartjuk meg */}
        {onToggleInfo && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Információ"
            aria-expanded={!!infoOpen}
            onClick={onToggleInfo}
            style={{ display: "none" }}
          />
        )}
      </div>

      {/* Info panel (lenyíló) */}
      {infoPanel && (
        <div className={`info-panel info-panel--overlay ${infoOpen ? "info-panel--open" : ""}`}>
          <div className="info-panel-inner">{infoPanel}</div>
        </div>
      )}

      {/* Tartalom */}
      {surface === "none" ? (
        <section style={{ marginTop: "var(--space-3)", minHeight: 0, height: "100%", minWidth: 0, overflowX: "clip" }}>
          {children}
        </section>
      ) : surface === "ghost" ? (
        <section
          className="surface-ghost stack"
          style={{ marginTop: "var(--space-3)", minHeight: 0, height: "100%", minWidth: 0, overflowX: "clip" }}
        >
          {children}
        </section>
      ) : (
        <section
          className="surface-layer card stack"
          style={{ marginTop: "var(--space-3)", minHeight: 0, height: "100%", minWidth: 0, overflowX: "clip" }}
        >
          {children}
        </section>
      )}

      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} space={space} onLogout={logout} />
    </div>
  );
}