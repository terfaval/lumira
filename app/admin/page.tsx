// /app/admin/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { supabase } from "@/src/lib/supabase/client";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";

export default function AdminIndexPage() {
  const router = useRouter();
  const { loading } = useRequireAuth();

  const [adminChecked, setAdminChecked] = useState(false);

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

  if (!loading && !adminChecked) {
    return <FullScreenLoadingOverlay open />;
  }

  return (
    <Shell title="Admin" space="dream" headerActions={null} infoOpen={false} onToggleInfo={() => {}}>
      <FullScreenLoadingOverlay open={loading && !adminChecked} />
      <div className="stack" style={{ width: "100%" }}>
        <GlassCardSurface className="stack" style={{ padding: "var(--space-3)" }} variant="flat" paper="evening">
          <div className="stack-tight">
            <p className="section-title">Admin központ</p>
            <p style={{ color: "var(--text-muted)" }}>Innen éred el az admin aloldalakat.</p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-2)",
            }}
          >
            <div
              className="stack-tight"
              style={{
                padding: "var(--space-3)",
                borderRadius: 12,
                border: "1px solid var(--card-border)",
                background: "var(--card-inner)",
              }}
            >
              <strong>Archetype queue</strong>
              <p style={{ color: "var(--text-muted)" }}>Queue elemek listázása és admin műveletek.</p>
              <Link href="/admin/archetypes" className="btn btn-primary">
                Megnyitás
              </Link>
            </div>
          </div>
        </GlassCardSurface>
      </div>
    </Shell>
  );
}

