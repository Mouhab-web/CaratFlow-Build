import { useEffect, useRef, useState } from "react";
import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { CameraResourceLease } from "./camera-lifecycle";

// ---------- Jewelry catalog (pure SVG so we don't ship extra assets) ----------
type EarringId = "stud" | "hoop" | "drop" | "chandelier";
type NecklaceId = "pendant" | "choker" | "solitaire" | "tennis";
type Metal = "gold" | "silver" | "rose";

const METAL_HEX: Record<Metal, { base: string; hi: string; shadow: string }> = {
  gold: { base: "#d4af37", hi: "#f7e29b", shadow: "#8a6a12" },
  silver: { base: "#d9dde3", hi: "#ffffff", shadow: "#6c7480" },
  rose: { base: "#e6a68a", hi: "#ffd7c4", shadow: "#8f5a48" },
};

const EARRINGS: { id: EarringId; label: string }[] = [
  { id: "stud", label: "Diamond Stud" },
  { id: "hoop", label: "Hoop" },
  { id: "drop", label: "Drop" },
  { id: "chandelier", label: "Chandelier" },
];

const NECKLACES: { id: NecklaceId; label: string }[] = [
  { id: "pendant", label: "Pendant" },
  { id: "solitaire", label: "Solitaire" },
  { id: "choker", label: "Choker" },
  { id: "tennis", label: "Tennis" },
];

function Earring({
  id,
  metal,
  size,
  mirror = false,
}: {
  id: EarringId;
  metal: Metal;
  size: number;
  mirror?: boolean;
}) {
  const c = METAL_HEX[metal];
  const w = size,
    h = size * 2;
  const flip = mirror ? -1 : 1;
  return (
    <svg width={w} height={h} viewBox="-50 0 100 200" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`m-${id}-${metal}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="60%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.shadow} />
        </radialGradient>
        <radialGradient id={`d-${id}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#dfefff" />
          <stop offset="100%" stopColor="#8fb7d9" />
        </radialGradient>
      </defs>
      <g transform={`scale(${flip},1)`}>
        {id === "stud" && (
          <circle cx="0" cy="10" r="10" fill={`url(#d-${id})`} stroke={c.base} strokeWidth="2" />
        )}
        {id === "hoop" && (
          <>
            <circle
              cx="0"
              cy="30"
              r="26"
              fill="none"
              stroke={`url(#m-${id}-${metal})`}
              strokeWidth="6"
            />
            <circle cx="0" cy="4" r="4" fill={c.base} />
          </>
        )}
        {id === "drop" && (
          <>
            <circle cx="0" cy="8" r="6" fill={`url(#d-${id})`} stroke={c.base} strokeWidth="1.5" />
            <line x1="0" y1="14" x2="0" y2="60" stroke={c.base} strokeWidth="2" />
            <ellipse cx="0" cy="80" rx="14" ry="22" fill={`url(#m-${id}-${metal})`} />
            <ellipse cx="-4" cy="72" rx="4" ry="8" fill={c.hi} opacity="0.6" />
          </>
        )}
        {id === "chandelier" && (
          <>
            <circle cx="0" cy="8" r="6" fill={`url(#d-${id})`} stroke={c.base} strokeWidth="1.5" />
            <path
              d="M-22 30 Q0 20 22 30"
              fill="none"
              stroke={`url(#m-${id}-${metal})`}
              strokeWidth="3"
            />
            {[-20, -8, 8, 20].map((x, i) => (
              <g key={i}>
                <line
                  x1={x}
                  y1="30"
                  x2={x}
                  y2={50 + Math.abs(x)}
                  stroke={c.base}
                  strokeWidth="1.5"
                />
                <circle
                  cx={x}
                  cy={54 + Math.abs(x)}
                  r="6"
                  fill={`url(#d-${id})`}
                  stroke={c.base}
                  strokeWidth="1"
                />
              </g>
            ))}
          </>
        )}
      </g>
    </svg>
  );
}

function Necklace({ id, metal, width }: { id: NecklaceId; metal: Metal; width: number }) {
  const c = METAL_HEX[metal];
  const h = width * 0.55;
  return (
    <svg width={width} height={h} viewBox="-200 0 400 220" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`chain-${id}-${metal}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="50%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.shadow} />
        </linearGradient>
        <radialGradient id={`gem-${id}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#dfefff" />
          <stop offset="100%" stopColor="#7fa8cf" />
        </radialGradient>
      </defs>
      {id === "choker" && (
        <path
          d="M-190 10 Q0 90 190 10"
          fill="none"
          stroke={`url(#chain-${id}-${metal})`}
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
      {id === "pendant" && (
        <>
          <path
            d="M-190 10 Q0 140 190 10"
            fill="none"
            stroke={`url(#chain-${id}-${metal})`}
            strokeWidth="3.5"
          />
          <path
            d="M0 138 L-22 168 L0 210 L22 168 Z"
            fill={`url(#gem-${id})`}
            stroke={c.base}
            strokeWidth="2"
          />
        </>
      )}
      {id === "solitaire" && (
        <>
          <path
            d="M-190 10 Q0 130 190 10"
            fill="none"
            stroke={`url(#chain-${id}-${metal})`}
            strokeWidth="3"
          />
          <circle cx="0" cy="140" r="18" fill={`url(#gem-${id})`} stroke={c.base} strokeWidth="2" />
          <circle cx="-6" cy="134" r="5" fill="#fff" opacity="0.7" />
        </>
      )}
      {id === "tennis" && (
        <g>
          {Array.from({ length: 24 }).map((_, i) => {
            const t = i / 23;
            const x = -190 + t * 380;
            const y = 10 + Math.sin(t * Math.PI) * 130;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="6"
                fill={`url(#gem-${id})`}
                stroke={c.base}
                strokeWidth="1"
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

// ---------- Try-on modal ----------
export default function JewelryTryOn({
  onClose,
  initialCategory = "earrings",
  cameraStartAuthorized = false,
  embedded = false,
}: {
  onClose: () => void;
  initialCategory?: "earrings" | "necklace";
  cameraStartAuthorized?: boolean;
  embedded?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraStarted, setCameraStarted] = useState(cameraStartAuthorized);
  const [retryToken, setRetryToken] = useState(0);
  const [category, setCategory] = useState<"earrings" | "necklace">(initialCategory);
  const [earring, setEarring] = useState<EarringId>("drop");
  const [necklace, setNecklace] = useState<NecklaceId>("pendant");
  const [metal, setMetal] = useState<Metal>("gold");
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [pose, setPose] = useState<{
    leftEar: { x: number; y: number };
    rightEar: { x: number; y: number };
    chin: { x: number; y: number };
    faceW: number;
  } | null>(null);

  useEffect(() => {
    if (!cameraStarted) return;

    let cancelled = false;
    const resources = new CameraResourceLease<FaceLandmarker>();
    let activeStream: MediaStream | null = null;
    let landmarker: FaceLandmarker | null = null;
    let raf = 0;
    const emaRef = { current: null as null | typeof pose };
    const alpha = 0.35;

    const detachVideo = () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      video.srcObject = null;
    };

    const shutdown = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resources.cancel();
      landmarker = null;
      detachVideo();
    };

    const fail = (message: string) => {
      if (cancelled) return;
      shutdown();
      setReady(false);
      setError(message);
    };

    const handlePageHide = () => {
      shutdown();
      setCameraStarted(false);
      setReady(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      shutdown();
      setCameraStarted(false);
      setReady(false);
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    async function init() {
      try {
        if (!window.isSecureContext) throw new Error("Camera requires HTTPS.");
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
          throw new TypeError("This browser does not expose a camera API.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!resources.adoptStream(stream)) return;
        activeStream = stream;
        const v = videoRef.current;
        if (!v) {
          fail("Could not attach the camera preview. Try again.");
          return;
        }
        v.srcObject = activeStream;
        await v.play();

        const { FilesetResolver, FaceLandmarker: FaceLandmarkerRuntime } =
          await import("@mediapipe/tasks-vision");
        if (cancelled || !resources.isActive) return;
        // Self-hosted (see public/mediapipe) so the CSP stays 'self' and the
        // face tracker works offline / behind restrictive networks.
        const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        if (cancelled || !resources.isActive) return;
        const makeLandmarker = (delegate: "GPU" | "CPU") =>
          FaceLandmarkerRuntime.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: "/mediapipe/models/face_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numFaces: 1,
          });
        // Prefer GPU; fall back to CPU where the WebGL GPU delegate can't init.
        let createdLandmarker: FaceLandmarker;
        try {
          createdLandmarker = await makeLandmarker("GPU");
        } catch (gpuError) {
          console.warn("Face landmarker GPU delegate failed, retrying on CPU", gpuError);
          if (cancelled || !resources.isActive) return;
          createdLandmarker = await makeLandmarker("CPU");
        }
        if (!resources.adoptModel(createdLandmarker)) return;
        landmarker = createdLandmarker;
        setReady(true);

        const tick = () => {
          if (
            cancelled ||
            !resources.isActive ||
            !landmarker ||
            !videoRef.current ||
            !wrapRef.current
          )
            return;
          let res: FaceLandmarkerResult;
          try {
            res = landmarker.detectForVideo(videoRef.current, performance.now());
          } catch {
            fail("Face tracking stopped unexpectedly. Retry the camera session.");
            return;
          }
          const lm = res.faceLandmarks?.[0];
          const rect = wrapRef.current.getBoundingClientRect();
          if (lm && rect.width) {
            // Mirror video: flip x
            const px = (n: { x: number; y: number }) => ({
              x: (1 - n.x) * rect.width,
              y: n.y * rect.height,
            });
            // MediaPipe FaceMesh indices
            const leftEar = px(lm[234]); // subject's right side (we mirror -> user's left ear on screen)
            const rightEar = px(lm[454]);
            const chin = px(lm[152]);
            const faceW = Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y);
            const next = { leftEar, rightEar, chin, faceW };
            const prev = emaRef.current;
            const smoothed = prev
              ? {
                  leftEar: {
                    x: prev.leftEar.x * (1 - alpha) + next.leftEar.x * alpha,
                    y: prev.leftEar.y * (1 - alpha) + next.leftEar.y * alpha,
                  },
                  rightEar: {
                    x: prev.rightEar.x * (1 - alpha) + next.rightEar.x * alpha,
                    y: prev.rightEar.y * (1 - alpha) + next.rightEar.y * alpha,
                  },
                  chin: {
                    x: prev.chin.x * (1 - alpha) + next.chin.x * alpha,
                    y: prev.chin.y * (1 - alpha) + next.chin.y * alpha,
                  },
                  faceW: prev.faceW * (1 - alpha) + next.faceW * alpha,
                }
              : next;
            emaRef.current = smoothed;
            setPose(smoothed);
          } else {
            emaRef.current = null;
            setPose(null);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { name?: string; message?: string };
        if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
          fail("Camera permission denied. Enable camera access and retry.");
        } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
          fail("No camera detected on this device.");
        } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
          fail("Another app is using the camera. Close it and retry.");
        } else {
          fail(err?.message || "Unable to start camera or face tracking.");
        }
      }
    }
    init();
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      shutdown();
    };
  }, [cameraStarted, retryToken]);

  // Auto-dismiss capture toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Placement geometry (item 5 — better fit) ----
  // Head roll so jewelry follows the tilt of the head.
  const roll = pose
    ? Math.atan2(pose.rightEar.y - pose.leftEar.y, pose.rightEar.x - pose.leftEar.x)
    : 0;
  const earSize = pose ? Math.max(30, pose.faceW * 0.2) : 40;
  // Earlobes sit a little below the ear-contour landmarks — drop the earrings down to the lobe.
  const earDrop = pose ? pose.faceW * 0.09 : 0;
  const leftEarPos = pose ? { x: pose.leftEar.x, y: pose.leftEar.y + earDrop } : { x: 0, y: 0 };
  const rightEarPos = pose ? { x: pose.rightEar.x, y: pose.rightEar.y + earDrop } : { x: 0, y: 0 };
  // Necklace: narrower and anchored at the base of the neck, just under the chin.
  const necklaceWidth = pose ? Math.max(150, pose.faceW * 1.95) : 240;
  const necklaceY = pose ? pose.chin.y + pose.faceW * 0.34 : 0;
  const necklaceX = pose ? pose.chin.x : 0;

  // ---- Capture: composite the mirrored video + jewelry overlay to a PNG ----
  const captureShot = async () => {
    try {
      const video = videoRef.current;
      const wrap = wrapRef.current;
      if (!video || !wrap || !video.videoWidth || !pose) {
        setToast("Camera not ready yet");
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const cw = Math.round(rect.width);
      const ch = Math.round(rect.height);
      const out = document.createElement("canvas");
      out.width = cw;
      out.height = ch;
      const ctx = out.getContext("2d");
      if (!ctx) return;

      // Mirrored, object-cover video draw (matches the on-screen preview)
      const vw = video.videoWidth,
        vh = video.videoHeight;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale,
        dh = vh * scale;
      const dx = (cw - dw) / 2,
        dy = (ch - dh) / 2;
      ctx.save();
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, cw - dx - dw, dy, dw, dh);
      ctx.restore();

      // Rasterize an <svg> DOM node into an <img>
      const svgToImg = (svg: SVGSVGElement) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const s = new XMLSerializer().serializeToString(svg);
          const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });

      const svgs = Array.from(wrap.querySelectorAll("svg")) as SVGSVGElement[];
      const drawPiece = async (
        svg: SVGSVGElement,
        x: number,
        y: number,
        w: number,
        h: number,
        rot = 0,
      ) => {
        const img = await svgToImg(svg);
        ctx.save();
        ctx.translate(x, y);
        if (rot) ctx.rotate(rot);
        ctx.drawImage(img, -w / 2, 0, w, h); // translate(-50%, 0) from the top-centre anchor
        ctx.restore();
      };

      if (category === "earrings" && svgs.length >= 2) {
        await drawPiece(svgs[0], leftEarPos.x, leftEarPos.y, earSize, earSize * 2);
        await drawPiece(svgs[1], rightEarPos.x, rightEarPos.y, earSize, earSize * 2);
      } else if (category === "necklace" && svgs.length >= 1) {
        await drawPiece(svgs[0], necklaceX, necklaceY, necklaceWidth, necklaceWidth * 0.55, roll);
      }

      setFlash(true);
      setTimeout(() => setFlash(false), 180);

      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jewelry-try-on-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setToast("Saved to downloads");
      }, "image/png");
    } catch (e) {
      console.error(e);
      setToast("Capture failed — try again");
    }
  };

  return (
    <div
      className={`${
        embedded ? "absolute inset-0 z-20 rounded-[inherit]" : "fixed inset-0 z-[80]"
      } bg-obsidian/95 backdrop-blur-md flex flex-col overflow-hidden`}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/30">
        <div className="text-xs uppercase tracking-[0.3em] text-gold truncate">
          Jewelry Try-On · Beta
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Capture — always visible (item 6) */}
          <button
            onClick={captureShot}
            disabled={!ready || !pose}
            className="inline-flex items-center text-[10px] uppercase tracking-[0.25em] px-4 py-2 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian font-medium shadow-glow hover:scale-[1.03] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            title="Capture screenshot"
          >
            ⤓ Capture
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center text-xs uppercase tracking-[0.25em] text-gold hover:text-obsidian hover:bg-gold transition px-4 py-2 rounded-full border border-gold/60"
            title="Close jewelry try-on"
          >
            Close ✕
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" ref={wrapRef}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Jewelry overlay */}
        {pose && (
          <>
            {category === "earrings" && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: leftEarPos.x,
                    top: leftEarPos.y,
                    transform: "translate(-50%, 0)",
                    pointerEvents: "none",
                  }}
                >
                  <Earring id={earring} metal={metal} size={earSize} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: rightEarPos.x,
                    top: rightEarPos.y,
                    transform: "translate(-50%, 0)",
                    pointerEvents: "none",
                  }}
                >
                  <Earring id={earring} metal={metal} size={earSize} mirror />
                </div>
              </>
            )}
            {category === "necklace" && (
              <div
                style={{
                  position: "absolute",
                  left: necklaceX,
                  top: necklaceY,
                  transform: `translate(-50%, 0) rotate(${roll}rad)`,
                  transformOrigin: "50% 0%",
                  pointerEvents: "none",
                }}
              >
                <Necklace id={necklace} metal={metal} width={necklaceWidth} />
              </div>
            )}
          </>
        )}

        {/* Status */}
        {!cameraStarted && !error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-md text-center bg-glass border border-border/40 rounded-3xl p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">
                Camera preview
              </div>
              <p className="text-sm text-foreground/80 mb-2">
                Camera access starts only after you choose Start Camera.
              </p>
              <p className="text-xs text-foreground/55 mb-4">
                Frames are processed locally for this demonstration and are not uploaded by the
                try-on.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPose(null);
                  setCameraStarted(true);
                }}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian text-xs uppercase tracking-[0.2em] font-medium shadow-glow"
              >
                Start Camera
              </button>
            </div>
          </div>
        )}
        {cameraStarted && !ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-foreground/80 text-sm">
            <div className="px-5 py-3 rounded-2xl bg-glass border border-border/40">
              Requesting camera and loading face tracking…
            </div>
          </div>
        )}
        {ready && !pose && !error && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="px-5 py-3 rounded-2xl bg-glass border border-border/40 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">
                Center your face
              </div>
              <p className="text-sm text-foreground/75">
                Keep your ears, chin, and shoulders visible.
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-md text-center bg-glass border border-border/40 rounded-3xl p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">
                Try-On unavailable
              </div>
              <p className="text-sm text-foreground/80 mb-4">{error}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPose(null);
                    setRetryToken((token) => token + 1);
                  }}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs uppercase tracking-[0.2em]"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-primary/40 text-primary text-xs uppercase tracking-[0.2em] hover:bg-primary/5"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Capture flash */}
        {flash && (
          <div className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: 0.8 }} />
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-glass rounded-full px-4 py-2 text-xs text-foreground/90 border border-gold/40 shadow-glow">
            {toast}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border/30 bg-glass px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["earrings", "necklace"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border transition ${
                category === c
                  ? "bg-gold text-obsidian border-gold shadow-glow"
                  : "border-border/50 text-foreground/70 hover:border-primary/50"
              }`}
            >
              {c === "earrings" ? "◉ Earrings" : "◒ Necklace"}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {(Object.keys(METAL_HEX) as Metal[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetal(m)}
                title={m}
                className={`w-8 h-8 rounded-full ring-1 ring-white/20 transition ${
                  metal === m ? "ring-2 ring-gold scale-110" : ""
                }`}
                style={{ background: METAL_HEX[m].base }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {category === "earrings" &&
            EARRINGS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEarring(e.id)}
                className={`px-3.5 py-2 rounded-full text-xs uppercase tracking-wider border transition ${
                  earring === e.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-foreground/70 hover:border-primary/40"
                }`}
              >
                {e.label}
              </button>
            ))}
          {category === "necklace" &&
            NECKLACES.map((n) => (
              <button
                key={n.id}
                onClick={() => setNecklace(n.id)}
                className={`px-3.5 py-2 rounded-full text-xs uppercase tracking-wider border transition ${
                  necklace === n.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-foreground/70 hover:border-primary/40"
                }`}
              >
                {n.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
