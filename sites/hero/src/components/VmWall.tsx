import { useEffect, useMemo, useRef } from "react";

type Props = {
  /** 0..1 fraction of machines currently active */
  fraction: number;
  cols?: number;
  rows?: number;
  className?: string;
};

const hash = (value: number) => {
  let x = value + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
};

// A wall of machine dots that ignite in random order as `fraction` rises.
// Cheap 2D canvas; redraws whenever the fraction changes.
export function VmWall({ fraction, cols = 96, rows = 14, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const order = useMemo(() => {
    const n = cols * rows;
    const idx = Array.from({ length: n }, (_, i) => i);
    idx.sort((a, b) => hash(a) - hash(b));
    // rank[dot] = position in ignition order
    const rank = new Array<number>(n);
    idx.forEach((dot, position) => {
      rank[dot] = position;
    });
    return rank;
  }, [cols, rows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = parent.clientWidth;
    const gap = w / cols;
    const h = gap * rows;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = cols * rows;
    const activeCount = Math.round(fraction * n);
    const r = Math.max(1.1, gap * 0.16);

    for (let i = 0; i < n; i++) {
      const cx = (i % cols) * gap + gap / 2;
      const cy = Math.floor(i / cols) * gap + gap / 2;
      const active = order[i] < activeCount;
      ctx.beginPath();
      ctx.arc(cx, cy, active ? r * 1.25 : r, 0, Math.PI * 2);
      if (active) {
        ctx.fillStyle = "rgba(126,203,221,0.95)";
        ctx.shadowColor = "rgba(126,203,221,0.8)";
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = "rgba(234,246,250,0.12)";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [fraction, cols, rows, order]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} aria-hidden />
    </div>
  );
}
