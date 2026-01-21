"use client";

import { useEffect, useRef } from "react";
import { registerListener, registerRaf } from "@/src/lib/perfDebug";

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

// Key change vs your previous FRAG:
// - NO time-wrap-dependent drift inside shader (prevents the "wrap glitch").
// - Palette cycling uses u_phase (0..1), which is periodic and continuous at wrap.
// - u_center is updated per-frame from JS (also periodic), so it can loop forever.
const FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2  u_resolution;
uniform float u_opacity;

uniform vec3 u_bg;
uniform vec3 u_accent;
uniform vec3 u_accent2;
uniform vec3 u_glow1;
uniform vec3 u_glow2;

uniform vec2  u_center;
uniform float u_zoom;
uniform int   u_iter;

// 0..1 cyclic phase (safe to wrap)
uniform float u_phase;

/* soft palette driven by your tokens */
vec3 palette(float t) {
  // t: 0..1
  vec3 base  = mix(u_accent2, u_accent, smoothstep(0.1, 0.9, t));
  // glaze: subtle periodic shimmer (u_phase wraps 0..1 => continuous)
  float s = 0.5 + 0.5 * sin((t + u_phase) * 6.28318);
  vec3 glaze = mix(u_glow1, u_glow2, s);

  vec3 col = mix(u_bg, base, 0.55);
  col = mix(col, glaze, 0.22);
  return col;
}

void main() {
  vec2 uv = (v_uv - 0.5);
  uv.x *= u_resolution.x / u_resolution.y;

  vec2 c0 = u_center;
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

  // subtle cyc: use u_phase rather than raw time (safe looping)
  vec3 col = palette(fract(t + u_phase));

  // inside is darker (blend into bg)
  col = mix(col, u_bg * 0.9, inside);

  // vignette
  float r = length(uv);
  col *= smoothstep(1.25, 0.35, r);

  outColor = vec4(col, u_opacity);
}
`;

type Props = {
  enabled?: boolean;

  /** 0..1; typical 0.05–0.10 */
  opacity?: number;

  /** start zoom (bigger = further away) */
  baseZoom?: number;

  /** smaller = slower zoom-in (only used in zoomMode="exp") */
  zoomSpeed?: number;

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

  /** cap FPS for perf (background doesn't need 60fps) */
  targetFps?: number;

  /** palette phase speed multiplier (cycles per second) */
  phaseSpeed?: number;

  /** css vars to read (defaults match your globals) */
  vars?: Partial<{
    bg: string; // --bg-root
    accent: string; // --accent
    accent2: string; // --accent-2
    glow1: string; // --glow-1
    glow2: string; // --glow-2
  }>;
};

export default function FractalBackground({
  enabled = true,
  opacity = 0.085,
  baseZoom = 2.6,
  zoomSpeed = 0.0,
  zoomLoopSeconds = 240,
  zoomAmplitude = 0.45,
  zoomMode = "loop",
  iterations = 140,
  maxDevicePixelRatio = 1.25,
  targetFps = 24,
  phaseSpeed = 0.012,
  vars,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const glRef = useRef<{
    gl: WebGL2RenderingContext;
    canvas: HTMLCanvasElement;
    prog: WebGLProgram;
    vao: WebGLVertexArrayObject;
    buf: WebGLBuffer;
    uniforms: {
      uResolution: WebGLUniformLocation | null;
      uOpacity: WebGLUniformLocation | null;
      uCenter: WebGLUniformLocation | null;
      uZoom: WebGLUniformLocation | null;
      uIter: WebGLUniformLocation | null;
      uBg: WebGLUniformLocation | null;
      uAccent: WebGLUniformLocation | null;
      uAccent2: WebGLUniformLocation | null;
      uGlow1: WebGLUniformLocation | null;
      uGlow2: WebGLUniformLocation | null;
      uPhase: WebGLUniformLocation | null;
    };
    readTokenColors: () => void;
    resize: () => void;
  } | null>(null);

  const rafRef = useRef(0);
  const rafActiveRef = useRef(false);
  const releaseRafRef = useRef<(() => void) | null>(null);
  const handleVisibilityRef = useRef<(() => void) | null>(null);

  const startRef = useRef(0);
  const lastTokenReadSecRef = useRef(0);

  // FPS throttle
  const lastFrameMsRef = useRef(0);
  const targetFpsRef = useRef(targetFps);

  const paramsRef = useRef({
    opacity,
    baseZoom,
    zoomSpeed,
    zoomLoopSeconds,
    zoomAmplitude,
    zoomMode,
    iterations,
    phaseSpeed,
  });

  const varsRef = useRef(vars);
  const dprCapRef = useRef(maxDevicePixelRatio);

  const lowQualityUntilRef = useRef(0);
  const lowQualityRef = useRef(false);
  const reducedRef = useRef(false);

  const baseFilter = "blur(0.7px) contrast(0.98) saturate(0.95)";

  useEffect(() => {
    if (!enabled) return;
    if (glRef.current) return;

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
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // uniforms
    const uResolution = gl.getUniformLocation(prog, "u_resolution");
    const uOpacity = gl.getUniformLocation(prog, "u_opacity");
    const uCenter = gl.getUniformLocation(prog, "u_center");
    const uZoom = gl.getUniformLocation(prog, "u_zoom");
    const uIter = gl.getUniformLocation(prog, "u_iter");
    const uPhase = gl.getUniformLocation(prog, "u_phase");

    const uBg = gl.getUniformLocation(prog, "u_bg");
    const uAccent = gl.getUniformLocation(prog, "u_accent");
    const uAccent2 = gl.getUniformLocation(prog, "u_accent2");
    const uGlow1 = gl.getUniformLocation(prog, "u_glow1");
    const uGlow2 = gl.getUniformLocation(prog, "u_glow2");

    // Clarke-ish famous point
    const centerX = -0.743643887037151;
    const centerY = 0.13182590420533;

    const readTokenColors = () => {
      const cs = getComputedStyle(document.body);

      const bgVar = varsRef.current?.bg ?? "--bg-root";
      const accentVar = varsRef.current?.accent ?? "--accent";
      const accent2Var = varsRef.current?.accent2 ?? "--accent-2";
      const glow1Var = varsRef.current?.glow1 ?? "--glow-1";
      const glow2Var = varsRef.current?.glow2 ?? "--glow-2";

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
      const baseDpr = Math.min(window.devicePixelRatio || 1, dprCapRef.current);
      const dpr = lowQualityRef.current ? Math.min(1.0, baseDpr) : baseDpr;

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
    const releaseResize = registerListener("window.resize:fractal");
    window.addEventListener("resize", onResize);

    glRef.current = {
      gl,
      canvas,
      prog,
      vao,
      buf,
      uniforms: {
        uResolution,
        uOpacity,
        uCenter,
        uZoom,
        uIter,
        uBg,
        uAccent,
        uAccent2,
        uGlow1,
        uGlow2,
        uPhase,
      },
      readTokenColors,
      resize,
    };

    startRef.current = performance.now();
    lastTokenReadSecRef.current = 0;
    lastFrameMsRef.current = 0;

    resize();
    readTokenColors();

    gl.uniform1f(uOpacity, clamp(paramsRef.current.opacity, 0, 1));
    gl.uniform1i(uIter, Math.max(40, Math.min(320, paramsRef.current.iterations)));

    // ✅ Always keep the visual layer stable (no scroll flicker)
    canvas.style.filter = baseFilter;

    const drawFrame = (now: number) => {
      const tSec = (now - startRef.current) / 1000;

      // Follow theme changes ~1x/sec
      if (!reducedRef.current && tSec - lastTokenReadSecRef.current > 1.0) {
        glRef.current?.readTokenColors();
        lastTokenReadSecRef.current = tSec;
      }

      // Low-quality windows (scroll/gesture) — keep visuals stable, only adjust DPR via resize()
      const lowQuality = performance.now() < lowQualityUntilRef.current;
      if (lowQuality !== lowQualityRef.current) {
        lowQualityRef.current = lowQuality;
        canvas.style.filter = baseFilter; // ✅ never toggle to "none"
        glRef.current?.resize();
      }

      // Continuous, infinite, periodic drift via JS phases (NO wrap discontinuity)
      const TAU = Math.PI * 2.0;
      const drift = 0.00055;
      const phx = (tSec * 0.06) % TAU;
      const phy = (tSec * 0.047) % TAU;

      const cX = centerX + drift * Math.cos(phx);
      const cY = centerY + drift * Math.sin(phy);
      gl.uniform2f(uCenter, cX, cY);

      // Zoom (looped by modulo on phase => no jumps)
      const { baseZoom, zoomMode, zoomSpeed, zoomLoopSeconds, zoomAmplitude } = paramsRef.current;

      let z = baseZoom;
      if (!reducedRef.current) {
        if (zoomMode === "fixed") {
          z = baseZoom;
        } else if (zoomMode === "exp") {
          // NOTE: exp can run into extreme zoom over long time.
          // Prefer "loop" for true "forever" behavior.
          z = baseZoom * Math.exp(zoomSpeed * tSec);
        } else {
          const tLoop = ((tSec % zoomLoopSeconds) / zoomLoopSeconds) * TAU; // 0..TAU
          z = baseZoom * Math.exp(zoomAmplitude * Math.sin(tLoop));
        }
      }

      // Palette phase: 0..1 loop, safe + continuous at wrap for sin/cos usage
      const phase = ((tSec * paramsRef.current.phaseSpeed) % 1 + 1) % 1;
      gl.uniform1f(uPhase, phase);

      gl.uniform1f(uZoom, z);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const loop = (now: number) => {
      const fps = Math.max(8, Math.min(60, targetFpsRef.current || 24));
      const minDt = 1000 / fps;

      if (now - lastFrameMsRef.current >= minDt) {
        lastFrameMsRef.current = now;
        drawFrame(now);
      }

      if (!rafActiveRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (!rafActiveRef.current) return;
      rafActiveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      releaseRafRef.current?.();
      releaseRafRef.current = null;
    };

    const startLoop = () => {
      if (rafActiveRef.current || reducedRef.current || document.hidden) return;
      rafActiveRef.current = true;
      releaseRafRef.current = registerRaf("FractalBackground");
      rafRef.current = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      if (document.hidden || reducedRef.current) {
        stopLoop();
        drawFrame(performance.now());
        return;
      }
      startLoop();
    };

    const handleScroll = () => {
      const jitter = 500 + Math.random() * 1000;
      lowQualityUntilRef.current = performance.now() + jitter;
    };

    const releaseVisibility = registerListener("document.visibilitychange:fractal");
    document.addEventListener("visibilitychange", handleVisibility);

    const releaseScroll = registerListener("window.scroll:fractal-low-quality");
    window.addEventListener("scroll", handleScroll, { passive: true });

    // First frame + start
    drawFrame(performance.now());
    startLoop();

    handleVisibilityRef.current = handleVisibility;

    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseVisibility();

      window.removeEventListener("scroll", handleScroll);
      releaseScroll();

      window.removeEventListener("resize", onResize);
      releaseResize();

      glRef.current = null;
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [enabled]);

  useEffect(() => {
    paramsRef.current = {
      opacity,
      baseZoom,
      zoomSpeed,
      zoomLoopSeconds,
      zoomAmplitude,
      zoomMode,
      iterations,
      phaseSpeed,
    };

    const glState = glRef.current;
    if (!glState) return;

    const { gl, uniforms } = glState;
    gl.uniform1f(uniforms.uOpacity, clamp(opacity, 0, 1));
    gl.uniform1i(uniforms.uIter, Math.max(40, Math.min(320, iterations)));
  }, [opacity, baseZoom, zoomSpeed, zoomLoopSeconds, zoomAmplitude, zoomMode, iterations, phaseSpeed]);

  useEffect(() => {
    varsRef.current = vars;
    glRef.current?.readTokenColors();
  }, [vars]);

  useEffect(() => {
    dprCapRef.current = maxDevicePixelRatio;
    glRef.current?.resize();
  }, [maxDevicePixelRatio]);

  useEffect(() => {
    targetFpsRef.current = targetFps;
  }, [targetFps]);

  // keep your reduced-motion wiring; you can set this to true if you want to hard-disable animation
  useEffect(() => {
    reducedRef.current = false;
    handleVisibilityRef.current?.();
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0, // ✅ stable: background layer; keep main content at zIndex: 1
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          // ✅ keep stable visual; avoid flicker on scroll
          filter: baseFilter,
          opacity: 1,
        }}
      />
    </div>
  );
}
