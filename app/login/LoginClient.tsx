// app/login/LoginClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    // ✅ login siker -> /new
    router.replace("/new");
    setBusy(false);
  }

  return (
    <main className="auth-page">
      <GlassCardSurface className="auth-card" variant="soft" paper="evening">
        <h1>Belépés</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            <span>Email</span>
            <GlassCardMatte padding="sm" tone="evening">
              <input
                className="auth-input matte-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </GlassCardMatte>
          </label>

          <div className="auth-actions">
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Belépés..." : "Belépés"}
            </button>
          </div>
        </form>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <p style={{ opacity: 0.8 }}>
          Nincs még fiókod? <Link href="/signup">Regisztráció</Link>
        </p>
      </GlassCardSurface>
    </main>
  );
}
