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
      {/* Background image */}
      <div style={{ ...styles.image, backgroundImage: `url(${src})` }} />

      {/* Soft animated gradient overlay */}
      <div
        style={{
          ...styles.overlay,
          animation: reduce ? "none" : "lumiraGradientDrift 28s ease-in-out infinite",
        }}
      />

      {/* Subtle vignette to keep UI readable */}
      <div style={styles.vignette} />

      <style jsx global>{`
        @keyframes lumiraGradientDrift {
          0%   { transform: translate3d(-2%, -2%, 0) scale(1.04); filter: blur(26px); }
          50%  { transform: translate3d( 2%,  1%, 0) scale(1.08); filter: blur(30px); }
          100% { transform: translate3d(-2%, -2%, 0) scale(1.04); filter: blur(26px); }
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
  },
  image: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    opacity: 1,
    transform: "scale(1.02)",
    filter: "saturate(1.05) contrast(1.02)",
  },
  overlay: {
    position: "absolute",
    inset: "-12%",
    opacity: 0.35,
    mixBlendMode: "screen",
    backgroundImage: `
      radial-gradient(closest-side at 20% 30%, rgba(140, 210, 255, 0.55), rgba(0,0,0,0)),
      radial-gradient(closest-side at 80% 35%, rgba(170, 150, 255, 0.45), rgba(0,0,0,0)),
      radial-gradient(closest-side at 55% 80%, rgba(120, 255, 210, 0.25), rgba(0,0,0,0)),
      linear-gradient(135deg, rgba(30, 60, 110, 0.25), rgba(10, 20, 40, 0.35))
    `,
    willChange: "transform, filter",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.55) 100%)",
    opacity: 0.9,
  },
};
