"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BackgroundImageLayer({
  enabled = true,
  src = "/background/background.png",
}: {
  enabled?: boolean;
  src?: string;
}) {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(prefersReducedMotion());
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" style={styles.root}>
      {/* 0) image */}
      <div style={{ ...styles.image, backgroundImage: `url(${src})` }} />

      {/* 1) animated gradient (now visible even without blend modes) */}
      <div
        style={{
          ...styles.gradient,
          animation: reduce ? "none" : "lumiraBgDrift 36s ease-in-out infinite",
        }}
      />

      {/* 2) dark scrim to ensure “sötétekkel” */}
      <div style={styles.scrim} />

      {/* 3) vignette for readability */}
      <div style={styles.vignette} />

      <style jsx global>{`
        @keyframes lumiraBgDrift {
          0% {
            background-position: 0% 20%, 100% 30%, 40% 100%, 0% 0%;
            transform: translate3d(-1.5%, -1.5%, 0) scale(1.05);
            filter: blur(22px);
          }
          50% {
            background-position: 60% 0%, 30% 80%, 100% 40%, 100% 100%;
            transform: translate3d(1.5%, 1%, 0) scale(1.09);
            filter: blur(28px);
          }
          100% {
            background-position: 0% 20%, 100% 30%, 40% 100%, 0% 0%;
            transform: translate3d(-1.5%, -1.5%, 0) scale(1.05);
            filter: blur(22px);
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",
    transform: "translateZ(0)",
    isolation: "isolate", // ✅ blend/overlay stabil
  },

  image: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transform: "scale(1.02)",
    filter: "saturate(1.02) contrast(1.04)",
  },

  gradient: {
    position: "absolute",
    inset: "-14%",
    zIndex: 1,
    opacity: 0.55, // ✅ láthatóbb
    // itt NINCS screen; inkább “soft light”/normal + scrim adja a sötétet
    mixBlendMode: "soft-light",
    backgroundImage: `
      radial-gradient(closest-side at 18% 28%, var(--glow-2), transparent 55%),
      radial-gradient(closest-side at 82% 32%, var(--glow-1), transparent 58%),
      radial-gradient(closest-side at 55% 82%, rgba(128,185,185,0.12), transparent 60%),
      linear-gradient(135deg, rgba(10,15,24,0.55), rgba(12,16,25,0.72))
    `,
    backgroundRepeat: "no-repeat",
    willChange: "transform, filter, background-position",
  },

  scrim: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    // ✅ garantált “sötétítés”, de még átengedi a képet
    background:
      "linear-gradient(180deg, rgba(12,16,25,0.40), rgba(12,16,25,0.62))",
    opacity: 1,
  },

  vignette: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background:
      "radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.62) 100%)",
    opacity: 0.95,
  },
};
