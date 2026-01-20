"use client";

import React from "react";

export function LumiraLoader({
  size = 42,
  /**
   * Backwards compatible prop:
   * Previously controlled 360° spin duration.
   * Now acts as the BASE cycle duration for the main "sigil float" motion.
   * (If you don’t pass it, defaults are tuned for calm loading.)
   */
  spinSeconds = 3.6,
  tone = "light",
  className = "",
}: {
  size?: number;
  spinSeconds?: number;
  tone?: "light" | "original";
  className?: string;
}) {
  return (
    <div
      className={`lumira-loader-root ${tone === "light" ? "tone-light" : ""} ${className}`}
      style={{ width: size, height: size } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* Animate the whole sigil together */}
      <div
        className="sigil"
        style={{ animationDuration: `${spinSeconds}s` } as React.CSSProperties}
      >
        <img
          src="/loading/lumira_loading_aura.svg"
          alt=""
          className="layer aura"
          draggable={false}
        />

        <img
          src="/loading/lumira_loading_triangle.svg"
          alt=""
          className="layer triangle"
          draggable={false}
        />

        {/* Wrapper lets us separate eye "breath" from blink */}
        <div className="eyeWrap">
          <img
            src="/loading/lumira_loading_eye.svg"
            alt=""
            className="layer eye"
            draggable={false}
          />
        </div>
      </div>

      <style jsx>{`
        .lumira-loader-root {
          position: relative;
          display: inline-block;
          flex: 0 0 auto;
          user-select: none;
        }

        /* Default: világos megjelenés sötét háttérhez */
        .tone-light {
          filter: invert(1);
          opacity: 0.95;
        }

        .sigil {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform-origin: 50% 50%;
          will-change: transform;
          animation-name: sigilFloat;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
        }

        /* ───────────────────────────────────────────── */
        /* Aura: glow + blur + pulse                      */
        /* ───────────────────────────────────────────── */

        .aura {
          opacity: 0.35;
          transform-origin: 50% 50%;
          will-change: transform, opacity, filter;
          filter:
            blur(1.4px)
            drop-shadow(0 0 10px rgba(255, 255, 255, 0.22))
            drop-shadow(0 0 22px rgba(255, 255, 255, 0.14));
          animation: auraPulse 3.6s ease-in-out infinite;
        }

        @keyframes auraPulse {
          0% {
            transform: scale(0.985);
            opacity: 0.22;
          }
          50% {
            transform: scale(1.055);
            opacity: 0.42;
          }
          100% {
            transform: scale(0.985);
            opacity: 0.22;
          }
        }

        /* ───────────────────────────────────────────── */
        /* Whole-sigil drift (“Sigil Float”)              */
        /* ───────────────────────────────────────────── */

        @keyframes sigilFloat {
          0% {
            transform: translateX(-2px) translateY(0px) rotate(-0.7deg);
          }
          50% {
            transform: translateX(2px) translateY(-2px) rotate(0.7deg);
          }
          100% {
            transform: translateX(-2px) translateY(0px) rotate(-0.7deg);
          }
        }

        /* ───────────────────────────────────────────── */
        /* Triangle: micro-sway (NOT a spinner)           */
        /* ───────────────────────────────────────────── */

        .triangle {
          transform-origin: 50% 60%;
          will-change: transform;
          animation: triangleSway 2.8s ease-in-out infinite;
        }

        @keyframes triangleSway {
          0% {
            transform: rotate(-7deg);
          }
          50% {
            transform: rotate(7deg);
          }
          100% {
            transform: rotate(-7deg);
          }
        }

        /* ───────────────────────────────────────────── */
        /* Eye: subtle breath + rare blink                */
        /* ───────────────────────────────────────────── */

        .eyeWrap {
          transform-origin: 50% 50%;
          will-change: transform;
          animation: eyeBreath 4.8s ease-in-out infinite;
        }

        @keyframes eyeBreath {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }

        .eye {
          transform-origin: 50% 50%;
          will-change: transform, opacity;
          animation: eyeBlink 7.5s infinite;
        }

        @keyframes eyeBlink {
          0%,
          96%,
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
          97% {
            transform: scaleY(0.12);
            opacity: 0.95;
          }
          98% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .sigil,
          .aura,
          .triangle,
          .eyeWrap,
          .eye {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
