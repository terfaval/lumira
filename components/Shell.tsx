"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { NapszakInitializer } from "./NapszakInitializer";
import { PrimaryButton } from "./PrimaryButton";

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

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className={`shell ${space === "evening" ? "evening-shell" : ""}`}>
      <NapszakInitializer space={space} />
      <header className="shell-header">
        <nav className="shell-nav">
          <Link href="/">Kezdő</Link>
          <Link href="/archive">Archívum</Link>
          <Link href="/sessions">Folyamatban</Link>
          <Link href="/evening">Esti tér</Link>
        </nav>
        <div className="shell-actions">
          <PrimaryButton onClick={logout} variant="secondary">
            Kijelentkezés
          </PrimaryButton>
        </div>
      </header>

      <div className="stack">
        <h1 className="shell-title">{title}</h1>
        <section className="surface-layer card stack">{children}</section>
      </div>
    </div>
  );
}