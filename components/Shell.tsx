// components/Shell.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { NapszakInitializer } from "./NapszakInitializer";
import { SidebarDrawer } from "./SidebarDrawer";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

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

  // ✅ Guest state
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detectGuest() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
          if (!cancelled) {
            setIsGuest(false);
            setAuthChecked(true);
          }
          return;
        }

        const { data: flags, error } = await supabase
          .from("user_flags")
          .select("is_guest")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled) {
          setIsGuest(!error && !!flags?.is_guest);
          setAuthChecked(true);
        }
      } catch {
        if (!cancelled) {
          setIsGuest(false);
          setAuthChecked(true);
        }
      }
    }

    detectGuest();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Normal logout (registered users)
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ✅ Guest exit + delete
  async function guestExit() {
    try {
      const res = await fetch("/api/auth/guest/exit", { method: "POST" });
      // ha nem ok, akkor is signOut-olunk, hogy ne ragadjon bent
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.warn("guest exit failed", j);
      }
    } catch (e) {
      console.warn("guest exit error", e);
    } finally {
      await supabase.auth.signOut();
      router.replace("/"); // landingre
      router.refresh();
    }
  }

  // ✅ Guestben ne nyissunk drawert (biztonsági öv)
  useEffect(() => {
    if (isGuest && drawerOpen) setDrawerOpen(false);
  }, [isGuest, drawerOpen]);

  return (
    <div
      className={`shell shell--fluid ${space === "evening" ? "evening-shell" : ""}`}
      style={{ position: "relative", minWidth: 0, overflowX: "clip" }}
    >
      <NapszakInitializer space={space} />

      {/* Felső sáv */}
      <div className="shell-topbar">
        {/* ✅ MENU: guestben tiltva/elrejtve */}
        {!isGuest ? (
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
        ) : (
          // ha szeretnéd, hagyhatsz itt egy helykitöltőt, hogy ne ugráljon a layout
          <div style={{ width: 40, height: 40 }} aria-hidden="true" />
        )}

        <h1 className="shell-title" style={{ margin: 0 }}>
          {title}
        </h1>

        <div className="shell-topbar-spacer" />

        {/* ✅ Guestben tegyünk ki "Kilépés és törlés" gombot */}
        {authChecked && isGuest ? (
          <button className="btn btn-secondary" onClick={guestExit}>
            Kilépés és törlés
          </button>
        ) : (
          headerActions
        )}

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

        {/* BRAND bal felső sarokban */}
        <div className="shell-brand">
          <BrandLockup />
        </div>
      </div>

      {infoPanel && (
        <div className={`info-panel info-panel--overlay ${infoOpen ? "info-panel--open" : ""}`}>
          <GlassCardSurface className="info-panel-inner" variant="flat" paper="evening">
            {infoPanel}
          </GlassCardSurface>
        </div>
      )}

      {/* Tartalom */}
      {surface === "none" ? (
        <section
          style={{
            marginTop: "var(--shell-content-gap, var(--space-3))",
            minHeight: 0,
            height: "100%",
            minWidth: 0,
            overflowX: "clip",
          }}
        >
          {children}
        </section>
      ) : surface === "ghost" ? (
        <section
          className="surface-ghost stack"
          style={{
            marginTop: "var(--shell-content-gap, var(--space-3))",
            minHeight: 0,
            height: "100%",
            minWidth: 0,
            overflowX: "clip",
          }}
        >
          {children}
        </section>
      ) : (
        <section
          className="surface-layer card stack"
          style={{
            marginTop: "var(--shell-content-gap, var(--space-3))",
            minHeight: 0,
            height: "100%",
            minWidth: 0,
            overflowX: "clip",
          }}
        >
          {children}
        </section>
      )}

      {/* ✅ SidebarDrawer: guestben teljesen OFF */}
      {!isGuest && (
        <SidebarDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          space={space}
          onLogout={logout}
        />
      )}
    </div>
  );
}
