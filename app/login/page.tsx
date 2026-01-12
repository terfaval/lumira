"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

export default function LoginPage() {
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

    const { error } = await supabase.auth.signInWithPassword({
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
      <section className="glass-card auth-card">
        <h1>Belépés</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            <span>Email</span>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-label">
            <span>Jelszó</span>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
      </section>
    </main>
  );
}