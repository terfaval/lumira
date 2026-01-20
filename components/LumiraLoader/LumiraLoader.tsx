"use client";

export function LumiraLoader({
  size = 42,
  spinSeconds = 10,
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
      className={`lumira-loader ${tone === "light" ? "tone-light" : ""} ${className}`}
      style={{ width: size, height: size } as React.CSSProperties}
      aria-hidden="true"
    >
      <img
        src="/loading/lumira_loading_triangle.svg"
        alt=""
        className="lumira-loader-triangle"
        style={{ animationDuration: `${spinSeconds}s` } as React.CSSProperties}
        draggable={false}
      />
      <img
        src="/loading/lumira_loading_eye.svg"
        alt=""
        className="lumira-loader-eye"
        draggable={false}
      />

      <style jsx>{`
        .lumira-loader {
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

        .lumira-loader-triangle,
        .lumira-loader-eye {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
        }

        .lumira-loader-triangle {
          transform-origin: 50% 50%;
          animation-name: lumira-spin;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes lumira-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .lumira-loader-triangle {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
