"use client";

import React from "react";

export function LumiraLoader({
  size = 42,
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
      <div className="sigil" style={{ animationDuration: `${spinSeconds}s` } as React.CSSProperties}>
        {/* Layer slots (stable z-index) */}
        <div className="slot auraSlot">
          <img src="/loading/lumira_loading_aura.svg" alt="" className="img aura" draggable={false} />
        </div>

        <div className="slot triSlot">
          <img
            src="/loading/lumira_loading_triangle.svg"
            alt=""
            className="img triangle"
            draggable={false}
          />
        </div>

        <div className="slot eyeSlot">
          <div className="eyeWrap">
            <div className="eyeBlink">
              <img
                src="/loading/lumira_loading_eye.svg"
                alt=""
                className="img eye eyeBack"
                draggable={false}
              />
              <img
                src="/loading/lumira_loading_eye.svg"
                alt=""
                className="img eye eyeFront"
                draggable={false}
              />
            </div>
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

        /* Make sigil a stacking context so z-index works predictably */
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
          isolation: isolate; /* key: stable stacking */
        }

        /* Layer slots control stacking (not the img nodes) */
        .slot {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .auraSlot {
          z-index: 0;
        }
        .triSlot {
          z-index: 1;
        }
        .eyeSlot {
          z-index: 2;
        }

        .img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        /* ───────────────────────────────────────────── */
        /* Tone handling — DO NOT apply generic filters to ".eye" */
        /* because it overrides eyeBack/eyeFront filters.        */
        /* ───────────────────────────────────────────── */

        .tone-light {
          opacity: 0.95;
        }

        .tone-light .triangle {
          filter: invert(1);
        }

        /* Aura: include invert in its chain */
        .aura {
          opacity: 0.28;
          transform-origin: 50% 50%;
          will-change: transform, opacity, filter;
          filter: blur(1.1px) drop-shadow(0 0 10px rgba(255, 255, 255, 0.18))
            drop-shadow(0 0 22px rgba(255, 255, 255, 0.1));
          animation: auraPulse 3.6s ease-in-out infinite;
        }

        .tone-light .aura {
          filter: invert(1) blur(1.1px) drop-shadow(0 0 10px rgba(255, 255, 255, 0.18))
            drop-shadow(0 0 22px rgba(255, 255, 255, 0.1));
        }

        /* Triangle: micro-sway */
        .triangle {
          transform-origin: 50% 60%;
          will-change: transform;
          animation: triangleSway 2.8s ease-in-out infinite;
        }

        /* Eye: reading motion lives on wrapper */
        .eyeWrap {
          position: absolute;
          inset: 0;
          transform-origin: 50% 50%;
          will-change: transform;
          animation: eyeRead 2.236s ease-in-out infinite;
        }

        .eyeBlink {
          position: absolute;
          inset: 0;
          transform-origin: 50% 50%;
          will-change: transform, opacity;
          animation: eyeBlink 7.5s infinite;
        }

        /* Eye focus pulse (applies to both back+front, OK) */
        .eye {
          transform-origin: 50% 50%;
          will-change: transform, opacity;
          animation: eyeFocus 1.618s ease-in-out infinite;
        }

        /* Back/front contrast trick */
        .eyeBack {
          opacity: 0.75;
          transform: scale(1.01);
          filter: blur(0.6px) drop-shadow(0 0 8px rgba(0, 0, 0, 0.75))
            drop-shadow(0 0 18px rgba(0, 0, 0, 0.45));
        }

        .eyeFront {
          opacity: 0.98;
        }

        /* Light tone: invert eye but keep dark shadows */
        .tone-light .eyeBack {
          filter: invert(1) blur(0.6px) drop-shadow(0 0 8px rgba(0, 0, 0, 0.75))
            drop-shadow(0 0 18px rgba(0, 0, 0, 0.45));
        }

        .tone-light .eyeFront {
          filter: invert(1);
        }

        /* ───────────────────────────────────────────── */
        /* Animations                                     */
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
          78% {
            transform: translate(-1.6px, 0.7px);
          }
          100% {
            transform: translate(0px, 0px);
          }
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
