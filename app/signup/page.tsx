"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardMatte, GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/");
    })();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.replace("/");
    }

    setBusy(false);
  }

  return (
    <main className="auth-page">
      <GlassCardSurface className="auth-card" variant="soft" paper="evening">
        <h1>Regisztráció</h1>
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
              {busy ? "Regisztráció..." : "Regisztráció"}
            </button>
          </div>
        </form>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <p style={{ opacity: 0.8 }}>
          Van már fiókod? <Link href="/login">Belépés</Link>
        </p>
      </GlassCardSurface>
    </main>
  );
}