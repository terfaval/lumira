"use client";

import { useEffect, useMemo, useState } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BackgroundImageLayer({
  enabled = true,
  src = "/background/morning.png",
}: {
  enabled?: boolean;
  src?: string;
}) {
  const [reduce, setReduce] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [fade, setFade] = useState(false);
  const [gradientOpacity, setGradientOpacity] = useState(0.55);

  useEffect(() => {
    setReduce(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg-gradient-opacity")
      .trim();
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      setGradientOpacity(parsed);
    }
  }, []);

  // crossfade when src changes
  useEffect(() => {
    if (!src || src === activeSrc) return;
    setNextSrc(src);
    setFade(true);

    const t = window.setTimeout(() => {
      setActiveSrc(src);
      setNextSrc(null);
      setFade(false);
    }, 420);

    return () => window.clearTimeout(t);
  }, [src, activeSrc]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" style={styles.root}>
      {/* base image */}
      <div
        style={{
          ...styles.image,
          backgroundImage: `url(${activeSrc})`,
          opacity: fade ? 0 : 1,
          transition: "opacity 420ms ease",
        }}
      />
      {/* next image for crossfade */}
      {nextSrc && (
        <div
          style={{
            ...styles.image,
            backgroundImage: `url(${nextSrc})`,
            opacity: fade ? 1 : 0,
            transition: "opacity 420ms ease",
          }}
        />
      )}

      {/* animated gradient */}
      <div
        style={{
          ...styles.gradient,
          opacity: gradientOpacity,
          animation: reduce ? "none" : "lumiraBgDrift 36s ease-in-out infinite",
        }}
      />

      {/* scrim */}
      <div style={styles.scrim} />

      {/* vignette */}
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
    isolation: "isolate",
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
    willChange: "opacity",
  },

  gradient: {
    position: "absolute",
    inset: "-14%",
    zIndex: 1,
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
    background: "var(--bg-scrim)",
    opacity: 1,
  },

  vignette: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    background: "var(--bg-vignette)",
    opacity: 1,
  },
};
