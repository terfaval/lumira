"use client";

import { useEffect, useMemo, useRef } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** Accepts #RRGGBB or #RRGGBBAA, returns 0..1 rgb (alpha ignored here). */
function hexToRgb01(hexRaw: string): [number, number, number] {
  const hex = (hexRaw || "").trim();
  if (!hex.startsWith("#")) return [0, 0, 0];

  const h = hex.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return [0, 0, 0];
  return [r / 255, g / 255, b / 255];
}

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_opacity;

uniform vec3 u_bg;
uniform vec3 u_accent;
uniform vec3 u_accent2;
uniform vec3 u_glow1;
uniform vec3 u_glow2;

uniform vec2 u_center;
uniform float u_zoom;
uniform int u_iter;

/* soft palette driven by your tokens */
vec3 palette(float t) {
  // t: 0..1
  // mix between accent / accent2, and glaze with glows
  vec3 base = mix(u_accent2, u_accent, smoothstep(0.1, 0.9, t));
  vec3 glaze = mix(u_glow1, u_glow2, 0.5 + 0.5 * sin((t + u_time * 0.02) * 6.28318));
  // keep it subdued: blend into bg
  vec3 col = mix(u_bg, base, 0.55);
  col = mix(col, glaze, 0.22);
  return col;
}

void main() {
  vec2 uv = (v_uv - 0.5);
  uv.x *= u_resolution.x / u_resolution.y;

  // ultra slow drift
  float drift = 0.00055;
  vec2 c0 = u_center + vec2(
    drift * cos(u_time * 0.06),
    drift * sin(u_time * 0.047)
  );

  // zoom
  vec2 z0 = uv / u_zoom;

  // Mandelbrot
  vec2 x = vec2(0.0);
  float m2 = 0.0;
  int i;
  for (i = 0; i < 5000; i++) {
    if (i >= u_iter) break;
    float xx = x.x*x.x - x.y*x.y + (z0.x + c0.x);
    float yy = 2.0*x.x*x.y + (z0.y + c0.y);
    x = vec2(xx, yy);
    m2 = dot(x, x);
    if (m2 > 4.0) break;
  }

  float it = float(i);

  // smooth coloring
  float smoothIt = it;
  if (m2 > 0.0) {
    smoothIt = it - log2(log2(m2)) + 4.0;
  }

  float t = smoothIt / float(u_iter);

  // inner area
  float inside = step(float(u_iter - 1), it);

  // Clarke-like slow color cycling (very subtle)
  float phase = u_time * 0.012;
  vec3 col = palette(fract(t + phase));

  // inside is darker (blend into bg)
  col = mix(col, u_bg * 0.9, inside);

  // vignette
  float r = length(uv);
  col *= smoothstep(1.25, 0.35, r);

  outColor = vec4(col, u_opacity);
}
`;

type Props = {
  /** show only when this returns true */
  enabled?: boolean;

  /** 0..1; typical 0.05–0.10 */
  opacity?: number;

  /** start zoom (bigger = further away) */
  baseZoom?: number;

  /** smaller = slower zoom-in */
  zoomSpeed?: number;

  /** wrap time to avoid float precision drift */
  timeWrapSeconds?: number;

  /** loop duration for log-zoom */
  zoomLoopSeconds?: number;

  /** log-zoom amplitude */
  zoomAmplitude?: number;

  /** zoom behavior */
  zoomMode?: "loop" | "fixed" | "exp";

  /** iterations 80–220 */
  iterations?: number;

  /** DPR clamp for perf */
  maxDevicePixelRatio?: number;

  /** css vars to read (defaults match your globals) */
  vars?: Partial<{
    bg: string;        // --bg-root
    accent: string;    // --accent
    accent2: string;   // --accent-2
    glow1: string;     // --glow-1
    glow2: string;     // --glow-2
  }>;
};

export default function FractalBackground({
  enabled = true,
  opacity = 0.085,
  baseZoom = 1.6,
  zoomSpeed = 0.010,
  timeWrapSeconds = 600,
  zoomLoopSeconds = 240,
  zoomAmplitude = 0.45,
  zoomMode = "loop",
  iterations = 150,
  maxDevicePixelRatio = 1.5,
  vars,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // fullscreen quad
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1,  1, -1, -1,  1,  -1, 1,  1, -1,  1, 1]),
      gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // uniforms
    const uResolution = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uOpacity = gl.getUniformLocation(prog, "u_opacity");
    const uCenter = gl.getUniformLocation(prog, "u_center");
    const uZoom = gl.getUniformLocation(prog, "u_zoom");
    const uIter = gl.getUniformLocation(prog, "u_iter");

    const uBg = gl.getUniformLocation(prog, "u_bg");
    const uAccent = gl.getUniformLocation(prog, "u_accent");
    const uAccent2 = gl.getUniformLocation(prog, "u_accent2");
    const uGlow1 = gl.getUniformLocation(prog, "u_glow1");
    const uGlow2 = gl.getUniformLocation(prog, "u_glow2");

    // Clarke-ish famous point
    const centerX = -0.743643887037151;
    const centerY =  0.13182590420533;

    let raf = 0;
    let start = performance.now();

    const readTokenColors = () => {
      const cs = getComputedStyle(document.body);

      const bgVar = vars?.bg ?? "--bg-root";
      const accentVar = vars?.accent ?? "--accent";
      const accent2Var = vars?.accent2 ?? "--accent-2";
      const glow1Var = vars?.glow1 ?? "--glow-1";
      const glow2Var = vars?.glow2 ?? "--glow-2";

      const bg = hexToRgb01(cs.getPropertyValue(bgVar));
      const a1 = hexToRgb01(cs.getPropertyValue(accentVar));
      const a2 = hexToRgb01(cs.getPropertyValue(accent2Var));
      const g1 = hexToRgb01(cs.getPropertyValue(glow1Var));
      const g2 = hexToRgb01(cs.getPropertyValue(glow2Var));

      gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
      gl.uniform3f(uAccent, a1[0], a1[1], a1[2]);
      gl.uniform3f(uAccent2, a2[0], a2[1], a2[2]);
      gl.uniform3f(uGlow1, g1[0], g1[1], g1[2]);
      gl.uniform3f(uGlow2, g2[0], g2[1], g2[2]);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // if your app changes data-napszak dynamically, re-read tokens periodically (cheap)
    let lastTokenReadRaw = 0;

    resize();
    readTokenColors();

    gl.uniform1f(uOpacity, clamp(opacity, 0, 1));
    gl.uniform2f(uCenter, centerX, centerY);
    gl.uniform1i(uIter, Math.max(40, Math.min(320, iterations)));

    const loop = (now: number) => {
      const tRaw = (now - start) / 1000;
      const t = reduced ? 0.0 : (tRaw % timeWrapSeconds);

      // re-read colors ~1x/sec to follow theme flips (day/night)
      if (!reduced && (tRaw - lastTokenReadRaw) > 1.0) {
        readTokenColors();
        lastTokenReadRaw = tRaw;
      }

      let z = baseZoom;
      if (!reduced) {
        if (zoomMode === "fixed") {
          z = baseZoom;
        } else if (zoomMode === "exp") {
          z = baseZoom * Math.exp(zoomSpeed * tRaw);
        } else {
          const phase = (t / zoomLoopSeconds) * Math.PI * 2.0;
          z = baseZoom * Math.exp(zoomAmplitude * Math.sin(phase));
        }
      }

      gl.uniform1f(uTime, reduced ? 0.0 : t);
      gl.uniform1f(uZoom, z);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [
    enabled,
    opacity,
    baseZoom,
    zoomSpeed,
    timeWrapSeconds,
    zoomLoopSeconds,
    zoomAmplitude,
    zoomMode,
    iterations,
    maxDevicePixelRatio,
    reduced,
    vars,
  ]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0, // fontos: a content fölé kell rakni? nem, inkább alá
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          // háttér jelleg + harmonizál a glow-kkal
          filter: "blur(0.7px) contrast(0.98) saturate(0.95)",
          opacity: 1,
        }}
      />
    </div>
  );
}
