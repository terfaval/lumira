"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/src/lib/supabase/client";

const APP_ENTRY_ROUTE = "/new";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (data.session) {
        router.replace(APP_ENTRY_ROUTE);
      } else {
        router.replace("/login");
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontSize: 18,
        fontWeight: 500,
      }}
    >
      Loading...
    </main>
  );
}