"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { NapszakInitializer } from "./NapszakInitializer";
import { PrimaryButton } from "./PrimaryButton";
// A következő lépésben küldöm ezt a komponenst:
import { SidebarDrawer } from "./SidebarDrawer";

export function Shell({
  title,
  children,
  space = "dream",
}: {
  title: string;
  children: ReactNode;
  space?: "dream" | "evening";
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className={`shell shell--fluid ${space === "evening" ? "evening-shell" : ""}`}>
      <NapszakInitializer space={space} />

      {/* Felső sáv: csak a hamburger + cím, nincs régi nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          {/* egyszerű hamburger ikon (SVG) */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="shell-title" style={{ margin: 0 }}>{title}</h1>
      </div>

      {/* Tartalom */}
      <section className="surface-layer card stack" style={{ marginTop: "var(--space-3)" }}>
        {children}
      </section>

      {/* Rejtett oldalsáv – a következő lépésben adom a komponenst és a CSS-t */}
      <SidebarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        space={space}
        onLogout={logout}
      />
    </div>
  );
}
