// components/Shell.tsx
"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { NapszakInitializer } from "./NapszakInitializer";
import { SidebarDrawer } from "./SidebarDrawer";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

export function Shell({
  title,
  children,
  space = "dream",
  headerActions,
  infoPanel,
  infoOpen,
  onToggleInfo,
  surface = "card",
  fullHeight = false,
}: {
  title: string;
  children: ReactNode;
  space?: "dream" | "evening";
  headerActions?: ReactNode;
  infoPanel?: ReactNode;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
  surface?: "card" | "none" | "ghost";
  fullHeight?: boolean;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // âś… Guest state
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestBusy, setGuestBusy] = useState(false);

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

  // âś… Normal logout (registered users)
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // âś… Guest exit + delete
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

  async function handleGuestSignup(e: FormEvent) {
    e.preventDefault();
    if (guestBusy) return;
    setGuestBusy(true);
    setGuestError(null);

    const { error } = await supabase.auth.updateUser({
      email: guestEmail,
      password: guestPassword,
    });

    if (error) {
      setGuestError(error.message);
      setGuestBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/guest/convert", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "guest_convert_failed");
      }
    } catch (err: any) {
      setGuestError(err?.message ?? "Nem sikerĂĽlt menteni a fiĂłkot.");
      setGuestBusy(false);
      return;
    }

    setIsGuest(false);
    setAuthChecked(true);
    setShowGuestSignup(false);
    setGuestEmail("");
    setGuestPassword("");
    setGuestBusy(false);
    router.refresh();
  }

  // âś… Guestben ne nyissunk drawert (biztonsĂˇgi Ă¶v)
  useEffect(() => {
    if (isGuest && drawerOpen) setDrawerOpen(false);
  }, [isGuest, drawerOpen]);

  return (
    <div
      className={`shell shell--fluid ${fullHeight ? "shell--fullHeight" : ""} ${
        space === "evening" ? "evening-shell" : ""
      }`}
      style={{ position: "relative", minWidth: 0, overflowX: "clip" }}
    >
      <NapszakInitializer space={space} />

      {/* FelsĹ‘ sĂˇv */}
      <div className="shell-topbar">
        {/* âś… MENU: guestben tiltva/elrejtve */}
        {!isGuest ? (
          <button
            type="button"
            aria-label="MenĂĽ"
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
          // ha szeretnĂ©d, hagyhatsz itt egy helykitĂ¶ltĹ‘t, hogy ne ugrĂˇljon a layout
          <div style={{ width: 40, height: 40 }} aria-hidden="true" />
        )}

        <h1 className="shell-title" style={{ margin: 0 }}>
          {title}
        </h1>

        <div className="shell-topbar-spacer" />

        {/* âś… Guestben tegyĂĽnk ki "KilĂ©pĂ©s Ă©s tĂ¶rlĂ©s" gombot */}
        {authChecked && isGuest ? (
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => setShowGuestSignup(true)}>
              Mentés és belépés
            </button>
            <button className="btn btn-secondary" onClick={guestExit}>
              Kilépés és törlés
            </button>
          </div>
        ) : (
          headerActions
        )}

        {onToggleInfo && (
          <button
            type="button"
            className="icon-btn"
            aria-label="InformĂˇciĂł"
            aria-expanded={!!infoOpen}
            onClick={onToggleInfo}
            style={{ display: "none" }}
          />
        )}

        {/* BRAND bal felsĹ‘ sarokban */}
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

      {/* âś… SidebarDrawer: guestben teljesen OFF */}
      {!isGuest && (
        <SidebarDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          space={space}
          onLogout={logout}
        />
      )}

      {showGuestSignup && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Regisztráció"
          onClick={() => !guestBusy && setShowGuestSignup(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <GlassCardSurface className="auth-card" variant="soft" paper="evening">
              <h1>Regisztráció</h1>
              <form onSubmit={handleGuestSignup} className="auth-form">
                <label className="auth-label">
                  <span>Email</span>
                  <GlassCardMatte padding="sm" tone="evening">
                    <input
                      className="auth-input matte-input"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                  </GlassCardMatte>
                </label>
                <label className="auth-label">
                  <span>Jelszó</span>
                  <GlassCardMatte padding="sm" tone="evening">
                    <input
                      className="auth-input matte-input"
                      type="password"
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      required
                    />
                  </GlassCardMatte>
                </label>
                <div className="auth-actions">
                  <button type="submit" disabled={guestBusy} className="btn btn-primary">
                    {guestBusy ? "Mentés..." : "Mentés és belépés"}
                  </button>
                  <button
                    type="button"
                    disabled={guestBusy}
                    className="btn btn-secondary"
                    onClick={() => setShowGuestSignup(false)}
                  >
                    Mégse
                  </button>
                </div>
              </form>
              {guestError && <p style={{ color: "crimson" }}>{guestError}</p>}
            </GlassCardSurface>
          </div>
        </div>
      )}
    </div>
  );
}


