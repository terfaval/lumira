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

        {/* Eye: wrapper separates reading motion from blink and focus */}
        <div className="eyeWrap">
          <div className="eyeBlink">
            <img
              src="/loading/lumira_loading_eye.svg"
              alt=""
              className="layer eye"
              draggable={false}
            />
          </div>
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

        /* Explicit stacking so the eye always stays readable */
        .aura {
          z-index: 0;
        }
        .triangle {
          z-index: 1;
        }
        .eyeWrap,
        .eyeBlink,
        .eye {
          z-index: 2;
        }

        /* ───────────────────────────────────────────── */
        /* Aura: glow + blur + pulse                      */
        /* (slightly toned down so it won't wash the eye) */
        /* ───────────────────────────────────────────── */

        .aura {
          opacity: 0.28;
          transform-origin: 50% 50%;
          will-change: transform, opacity, filter;
          filter: blur(1.1px) drop-shadow(0 0 10px rgba(255, 255, 255, 0.18))
            drop-shadow(0 0 22px rgba(255, 255, 255, 0.1));
          animation: auraPulse 3.6s ease-in-out infinite;
        }

        @keyframes auraPulse {
          0% {
            transform: scale(0.985);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.4;
          }
          100% {
            transform: scale(0.985);
            opacity: 0.2;
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
        /* Triangle: micro-sway                           */
        /* (slightly smaller so the "reading" stands out) */
        /* ───────────────────────────────────────────── */

        .triangle {
          transform-origin: 50% 60%;
          will-change: transform;
          animation: triangleSway 2.8s ease-in-out infinite;
        }

        @keyframes triangleSway {
          0% {
            transform: rotate(-5deg);
          }
          50% {
            transform: rotate(5deg);
          }
          100% {
            transform: rotate(-5deg);
          }
        }

        /* ───────────────────────────────────────────── */
        /* Eye: "reading" inner play                      */
        /* - eyeWrap: saccades + occasional line return   */
        /* - eyeBlink: rare blink                         */
        /* - eye: subtle focus pulse                       */
        /* Fibonacci-ish cycle lengths so it doesn't loop */
        /* ───────────────────────────────────────────── */

        .eyeWrap {
          transform-origin: 50% 50%;
          will-change: transform;
          animation: eyeRead 2.236s ease-in-out infinite;
        }

        @keyframes eyeRead {
          0% {
            transform: translate(0px, 0px);
          }
          10% {
            transform: translate(1.2px, -0.2px);
          }
          20% {
            transform: translate(0.4px, 0px);
          }
          32% {
            transform: translate(1.8px, 0.1px);
          }
          44% {
            transform: translate(0.9px, -0.1px);
          }
          58% {
            transform: translate(2.2px, 0.2px);
          }
          72% {
            transform: translate(1.3px, 0px);
          }
          /* “line return” */
          78% {
            transform: translate(-1.6px, 0.7px);
          }
          100% {
            transform: translate(0px, 0px);
          }
        }

        .eyeBlink {
          position: absolute;
          inset: 0;
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

        .eye {
          transform-origin: 50% 50%;
          will-change: transform, opacity;
          animation: eyeFocus 1.618s ease-in-out infinite;
        }

        @keyframes eyeFocus {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.018);
            opacity: 0.98;
          }
        }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .sigil,
          .aura,
          .triangle,
          .eyeWrap,
          .eyeBlink,
          .eye {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
