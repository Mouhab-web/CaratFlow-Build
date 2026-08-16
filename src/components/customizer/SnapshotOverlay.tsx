import { useEffect, useRef, useState } from "react";
import { useRing } from "@/lib/ring-store";
import { renderRingSnapshot } from "@/lib/ring-snapshot";
import type { DebugFrame } from "./ARTryOn";

type DebugRef = { current: DebugFrame };

/**
 * Renders the currently-configured ring as a 2D PNG snapshot and overlays it
 * on the finger using the same tracked landmarks as the 3D scene.
 */
export default function SnapshotOverlay({ debugRef }: { debugRef: DebugRef }) {
  const { metal, band, shape, setting, halo, sideStone, carat } = useRing();
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Regenerate PNG whenever ring configuration changes.
  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    renderRingSnapshot({ metal, band, shape, setting, halo, sideStone, carat }, 512)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch((e) => console.error("Snapshot failed:", e))
      .finally(() => { if (!cancelled) setRendering(false); });
    return () => { cancelled = true; };
  }, [metal, band, shape, setting, halo, sideStone, carat]);

  // Drive image transform from debugRef every frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = imgRef.current;
      const d = debugRef.current;
      if (el) {
        if (d.active && d.center && d.xAxis) {
          const angleDeg = (Math.atan2(-d.xAxis.y, d.xAxis.x) * 180) / Math.PI;
          // Ring diameter across finger ≈ phalanx * 0.85 (matches HandTrackedRing).
          const ringPx = Math.max(40, d.phalanxLen * 1.05);
          el.style.opacity = "1";
          el.style.width = `${ringPx}px`;
          el.style.height = `${ringPx}px`;
          el.style.left = `${d.center.x - ringPx / 2}px`;
          el.style.top = `${d.center.y - ringPx / 2}px`;
          el.style.transform = `rotate(${angleDeg}deg)`;
        } else {
          el.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [debugRef]);

  return (
    <>
      {url && (
        <img
          ref={imgRef}
          src={url}
          alt="Ring 2D overlay"
          className="absolute pointer-events-none select-none"
          style={{
            opacity: 0,
            transformOrigin: "center",
            filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))",
            willChange: "transform, left, top, width, height",
          }}
        />
      )}
      {rendering && (
        <div className="absolute top-16 right-4 bg-obsidian/85 border border-gold/40 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-gold pointer-events-none">
          Rendering 2D…
        </div>
      )}
    </>
  );
}
