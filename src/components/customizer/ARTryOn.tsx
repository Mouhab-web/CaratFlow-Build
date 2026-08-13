import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { useRing } from "@/lib/ring-store";
import {
  BANDS,
  SETTINGS,
  SHAPES,
  SIDE_STONES,
  CARAT_SCALE_MAP,
  getHaloFile,
  METAL_COLOR,
} from "@/lib/ring-config";
import SnapshotOverlay from "./SnapshotOverlay";
import { CameraResourceLease } from "./camera-lifecycle";

// ---------- Shared GLB + metal helpers (mirrors RingViewer) ----------
function applyMetal(scene: THREE.Object3D, metal: keyof typeof METAL_COLOR) {
  const m = METAL_COLOR[metal];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        const name = (mat.name || "").toLowerCase();
        if (
          name.includes("diamond") ||
          name.includes("stone") ||
          name.includes("gem") ||
          std.transparent
        )
          return;
        std.color = new THREE.Color(m.color);
        std.metalness = m.metalness;
        std.roughness = m.roughness;
        std.needsUpdate = true;
      });
    }
  });
}

function GLBModel({ url, scale }: { url: string; scale?: [number, number, number] }) {
  const { scene } = useGLTF(url);
  const metal = useRing((s) => s.metal);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    applyMetal(cloned, metal);
    // Lazy import to keep bundle graph flat
    import("@/lib/ring-materials").then(({ enhanceDiamonds }) => enhanceDiamonds(cloned));
  }, [cloned, metal]);
  return <primitive object={cloned} scale={scale || [1, 1, 1]} />;
}

// ---------- Hand-tracked ring scene ----------
type LandmarkRef = { current: { x: number; y: number; z: number }[] | null };

export type OcclusionMode = "off" | "fast" | "quality";

export type ArSettings = {
  bandThickness: number; // occluder radius multiplier
  wrapAmount: number; // occluder length multiplier (0..1.5)
  tilt: number; // extra rotation around finger axis (rad)
  offsetX: number; // px offset
  offsetY: number; // px offset
  rotOffset: number; // rad added around camera Z
  scaleMul: number; // scale multiplier
  smoothing: number; // 0..1 (higher = smoother, more lag)
  debug: boolean;
  occlusionMode: OcclusionMode;
};

export const DEFAULT_AR_SETTINGS: ArSettings = {
  bandThickness: 1,
  wrapAmount: 1,
  tilt: 0,
  offsetX: 0,
  offsetY: 0,
  rotOffset: 0,
  scaleMul: 1,
  smoothing: 0.55,
  debug: false,
  occlusionMode: "fast",
};

export type FingerProfile = "index" | "middle" | "ring" | "pinky";
export const FINGER_PROFILES: FingerProfile[] = ["index", "middle", "ring", "pinky"];
export const CALIBRATION_STORAGE_PREFIX = "ar-calibration-v1:";
export const CALIBRATION_EXPORT_VERSION = 1;

export type DebugFrame = {
  mcp: { x: number; y: number } | null;
  pip: { x: number; y: number } | null;
  center: { x: number; y: number } | null;
  xAxis: { x: number; y: number } | null; // finger direction (screen px)
  yAxis: { x: number; y: number } | null; // stone direction (screen px)
  phalanxLen: number;
  scale: number;
  active: boolean;
};

export type StabilityFrame = {
  stableMs: number; // ms current pose has been "stable"
  isStable: boolean;
  centerVarPx: number;
  scaleVarPct: number;
};

type SettingsRef = { current: ArSettings };
type DebugRef = { current: DebugFrame };
type StabilityRef = { current: StabilityFrame };

function HandTrackedRing({
  landmarkRef,
  mirror,
  settingsRef,
  debugRef,
  stabilityRef,
}: {
  landmarkRef: LandmarkRef;
  mirror: boolean;
  settingsRef: SettingsRef;
  debugRef: DebugRef;
  stabilityRef: StabilityRef;
}) {
  const { band, shape, setting, halo, sideStone, carat } = useRing();
  const bandFile = BANDS.find((b) => b.id === band)?.file;
  const settingFile = SETTINGS.find((s) => s.id === setting)?.file;
  const shapeFile = SHAPES.find((s) => s.id === shape)?.file;
  const haloFile = getHaloFile(halo, shape);
  const sideStoneFile = SIDE_STONES.find((s) => s.id === sideStone)?.file;
  const cs = CARAT_SCALE_MAP[carat] || 1;

  const groupRef = useRef<THREE.Group>(null);
  const occluderFastRef = useRef<THREE.Mesh>(null);
  const occluderQualityRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const fingerOccluder = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
    });
    material.side = THREE.DoubleSide;
    return material;
  }, []);

  // Temporal filter state — One-Euro-inspired with velocity-aware alpha
  const state = useRef({
    initialized: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    scale: 0,
    quat: new THREE.Quaternion(),
    // EMA history for finger direction (angle) — additional stability layer
    fdxSm: 1,
    fdySm: 0,
    missFrames: 0,
    // Stability tracking (for auto-calibration)
    stableCenter: { x: 0, y: 0 },
    stableScale: 0,
    stableSince: 0,
    lastTs: 0,
  });

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const lms = landmarkRef.current;
    const sw = size.width;
    const sh = size.height;
    const S = settingsRef.current;

    if (!lms || lms.length < 21) {
      state.current.missFrames++;
      if (state.current.missFrames > 8) {
        state.current.scale = THREE.MathUtils.lerp(state.current.scale, 0, 0.15);
        state.current.initialized = false;
      }
      g.scale.setScalar(state.current.scale);
      debugRef.current.active = false;
      state.current.stableSince = 0;
      stabilityRef.current = { stableMs: 0, isStable: false, centerVarPx: 0, scaleVarPct: 0 };
      return;
    }
    state.current.missFrames = 0;

    const mcp = lms[13];
    const pip = lms[14];
    const toScreen = (lm: { x: number; y: number }) => ({
      x: (mirror ? 1 - lm.x : lm.x) * sw,
      y: lm.y * sh,
    });
    const a = toScreen(mcp);
    const b = toScreen(pip);

    const rawMx = a.x * 0.65 + b.x * 0.35;
    const rawMy = a.y * 0.65 + b.y * 0.35;
    const wxRaw = rawMx - sw / 2 + S.offsetX;
    const wyRaw = sh / 2 - rawMy + S.offsetY;

    const phalanxLen = Math.hypot(b.x - a.x, b.y - a.y);
    const idx = toScreen(lms[5]);
    const pinky = toScreen(lms[17]);
    const handBreadth = Math.hypot(idx.x - pinky.x, idx.y - pinky.y);
    const ringDiameterPx = Math.max(24, Math.min(phalanxLen * 0.85, handBreadth * 0.32));
    const targetScale = (ringDiameterPx / 2) * S.scaleMul;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fingerLen = Math.max(0.0001, Math.hypot(dx, dy));
    const fdxRaw = dx / fingerLen;
    const fdyRaw = -dy / fingerLen; // screen y is inverted

    // Extra EMA on finger direction to combat jitter/straightening
    const dirAlpha = THREE.MathUtils.clamp(1 - S.smoothing * 0.85, 0.05, 1);
    state.current.fdxSm = THREE.MathUtils.lerp(state.current.fdxSm, fdxRaw, dirAlpha);
    state.current.fdySm = THREE.MathUtils.lerp(state.current.fdySm, fdyRaw, dirAlpha);
    const smLen = Math.max(0.0001, Math.hypot(state.current.fdxSm, state.current.fdySm));
    const fdx = state.current.fdxSm / smLen;
    const fdy = state.current.fdySm / smLen;

    const depthLean = THREE.MathUtils.clamp(((pip.z ?? 0) - (mcp.z ?? 0)) * 2.8, -0.28, 0.28);
    const xAxis = new THREE.Vector3(fdx, fdy, depthLean).normalize();
    const stoneLean = (mirror ? -0.18 : 0.18) * S.wrapAmount;
    const yAxis = new THREE.Vector3(0, stoneLean, 1).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
    yAxis.crossVectors(zAxis, xAxis).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    // Apply user tilt around finger axis + rotOffset around camera Z
    if (S.tilt !== 0) {
      const tiltQ = new THREE.Quaternion().setFromAxisAngle(xAxis, S.tilt);
      targetQuat.premultiply(tiltQ);
    }
    if (S.rotOffset !== 0) {
      const rotQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), S.rotOffset);
      targetQuat.premultiply(rotQ);
    }

    if (!state.current.initialized) {
      state.current.x = wxRaw;
      state.current.y = wyRaw;
      state.current.scale = targetScale;
      state.current.quat.copy(targetQuat);
      state.current.initialized = true;
    }

    const dt = Math.max(0.001, delta);
    const predictedX = state.current.x + state.current.vx * dt;
    const predictedY = state.current.y + state.current.vy * dt;
    const jump = Math.hypot(wxRaw - predictedX, wyRaw - predictedY);
    const jumpLimit = Math.max(40, handBreadth * 0.8);
    const isOutlier = jump > jumpLimit;

    // Smoothing-controlled alpha (higher smoothing = lower alpha)
    const speed = Math.hypot(state.current.vx, state.current.vy);
    const base = 1 - S.smoothing; // 0.45 for default 0.55
    const minAlpha = base * 0.18;
    const maxAlpha = base;
    const alpha = isOutlier
      ? Math.max(0.02, base * 0.08)
      : THREE.MathUtils.clamp(minAlpha + (speed / 800) * (maxAlpha - minAlpha), minAlpha, maxAlpha);

    const newX = THREE.MathUtils.lerp(state.current.x, wxRaw, alpha);
    const newY = THREE.MathUtils.lerp(state.current.y, wyRaw, alpha);
    state.current.vx = THREE.MathUtils.lerp(state.current.vx, (newX - state.current.x) / dt, 0.3);
    state.current.vy = THREE.MathUtils.lerp(state.current.vy, (newY - state.current.y) / dt, 0.3);
    state.current.x = newX;
    state.current.y = newY;

    const scaleJump =
      Math.abs(targetScale - state.current.scale) / Math.max(1, state.current.scale);
    const scaleAlpha = scaleJump > 0.5 ? Math.max(0.03, base * 0.12) : Math.max(0.05, base * 0.4);
    state.current.scale = THREE.MathUtils.lerp(state.current.scale, targetScale, scaleAlpha);

    const rotAlpha = Math.max(0.05, base * 0.6);
    state.current.quat.slerp(targetQuat, rotAlpha);

    g.position.set(state.current.x, state.current.y, 0);
    g.scale.setScalar(state.current.scale);
    g.quaternion.copy(state.current.quat);

    // Live-update occluders from settings + mode toggle
    const applyOccluderScale = (m: THREE.Mesh | null) => {
      if (!m) return;
      m.scale.set(S.wrapAmount, S.bandThickness, S.bandThickness);
    };
    applyOccluderScale(occluderFastRef.current);
    applyOccluderScale(occluderQualityRef.current);
    if (occluderFastRef.current) occluderFastRef.current.visible = S.occlusionMode === "fast";
    if (occluderQualityRef.current)
      occluderQualityRef.current.visible = S.occlusionMode === "quality";

    // Publish debug frame (screen-space coords)
    const cx = state.current.x + sw / 2;
    const cy = sh / 2 - state.current.y;
    const axisLenPx = Math.max(40, phalanxLen * 0.6);
    debugRef.current = {
      mcp: { x: a.x, y: a.y },
      pip: { x: b.x, y: b.y },
      center: { x: cx, y: cy },
      xAxis: { x: fdx * axisLenPx, y: -fdy * axisLenPx },
      yAxis: { x: 0 * axisLenPx, y: -stoneLean * axisLenPx - axisLenPx * 0.6 },
      phalanxLen,
      scale: state.current.scale,
      active: true,
    };

    // Stability tracking for auto-calibration
    const nowMs = performance.now();
    const dtMs = state.current.lastTs ? nowMs - state.current.lastTs : 16;
    state.current.lastTs = nowMs;
    const dCenter = Math.hypot(
      state.current.x - state.current.stableCenter.x,
      state.current.y - state.current.stableCenter.y,
    );
    const dScale =
      state.current.stableScale > 0
        ? Math.abs(state.current.scale - state.current.stableScale) / state.current.stableScale
        : 0;
    const centerTol = Math.max(6, phalanxLen * 0.08);
    const stableNow = dCenter < centerTol && dScale < 0.06;
    if (stableNow) {
      state.current.stableSince += dtMs;
    } else {
      state.current.stableSince = 0;
      state.current.stableCenter = { x: state.current.x, y: state.current.y };
      state.current.stableScale = state.current.scale;
    }
    stabilityRef.current = {
      stableMs: state.current.stableSince,
      isStable: state.current.stableSince > 1000,
      centerVarPx: dCenter,
      scaleVarPct: dScale * 100,
    };
  });

  return (
    <group ref={groupRef}>
      <Center>
        <group>
          {/* Fast occluder — single low-poly cylinder, cheapest */}
          <mesh
            ref={occluderFastRef}
            rotation={[0, 0, Math.PI / 2]}
            renderOrder={-10}
            visible={false}
          >
            <cylinderGeometry args={[0.48, 0.52, 3.1, 32, 1, true]} />
            <primitive object={fingerOccluder} attach="material" />
          </mesh>
          {/* Quality occluder — higher-poly tapered capsule with capped ends for cleaner silhouette */}
          <mesh
            ref={occluderQualityRef}
            rotation={[0, 0, Math.PI / 2]}
            renderOrder={-10}
            visible={false}
          >
            <capsuleGeometry args={[0.5, 3.0, 12, 48]} />
            <primitive object={fingerOccluder} attach="material" />
          </mesh>
          {bandFile && <GLBModel url={bandFile} />}
          {settingFile && <GLBModel url={settingFile} />}
          {shapeFile && <GLBModel url={shapeFile} scale={[cs, cs, cs]} />}
          {haloFile && <GLBModel url={haloFile} />}
          {sideStoneFile && <GLBModel url={sideStoneFile} />}
        </group>
      </Center>
    </group>
  );
}

// ---------- Debug overlay (SVG) ----------
function DebugOverlay({ debugRef }: { debugRef: DebugRef }) {
  const [, force] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      force((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const d = debugRef.current;
  if (!d.active || !d.mcp || !d.pip || !d.center || !d.xAxis || !d.yAxis) {
    return (
      <div className="absolute top-16 left-4 bg-obsidian/80 rounded-lg px-3 py-2 text-[10px] font-mono text-foreground/70 border border-border/40 pointer-events-none">
        debug: no landmarks
      </div>
    );
  }
  const { mcp, pip, center, xAxis, yAxis } = d;
  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: "screen" }}
      >
        {/* MCP → PIP finger axis */}
        <line
          x1={mcp.x}
          y1={mcp.y}
          x2={pip.x}
          y2={pip.y}
          stroke="#facc15"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <circle cx={mcp.x} cy={mcp.y} r={5} fill="#facc15" />
        <circle cx={pip.x} cy={pip.y} r={5} fill="#f97316" />
        {/* Ring center */}
        <circle cx={center.x} cy={center.y} r={7} fill="none" stroke="#22d3ee" strokeWidth={2} />
        {/* X axis (finger direction) — red */}
        <line
          x1={center.x}
          y1={center.y}
          x2={center.x + xAxis.x}
          y2={center.y + xAxis.y}
          stroke="#ef4444"
          strokeWidth={3}
          markerEnd="url(#arrH)"
        />
        {/* Y axis (stone up) — green */}
        <line
          x1={center.x}
          y1={center.y}
          x2={center.x + yAxis.x}
          y2={center.y + yAxis.y}
          stroke="#22c55e"
          strokeWidth={3}
          markerEnd="url(#arrH)"
        />
        <defs>
          <marker
            id="arrH"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
      </svg>
      <div className="absolute top-16 left-4 bg-obsidian/85 rounded-lg px-3 py-2 text-[10px] font-mono text-foreground/80 border border-gold/40 pointer-events-none space-y-0.5">
        <div>
          <span className="text-gold">phalanx</span> {d.phalanxLen.toFixed(1)}px
        </div>
        <div>
          <span className="text-gold">scale</span> {d.scale.toFixed(2)}
        </div>
        <div>
          <span className="text-red-400">X</span> ({xAxis.x.toFixed(1)}, {xAxis.y.toFixed(1)})
        </div>
        <div>
          <span className="text-green-400">Y</span> ({yAxis.x.toFixed(1)}, {yAxis.y.toFixed(1)})
        </div>
        <div>
          <span className="text-cyan-300">c</span> ({center.x.toFixed(0)}, {center.y.toFixed(0)})
        </div>
      </div>
    </>
  );
}

// Ortho camera matching canvas pixels
function OrthoCam() {
  const { size, set } = useThree();
  const camRef = useRef<THREE.OrthographicCamera | null>(null);
  useEffect(() => {
    const cam = new THREE.OrthographicCamera(
      -size.width / 2,
      size.width / 2,
      size.height / 2,
      -size.height / 2,
      -1000,
      1000,
    );
    cam.position.set(0, 0, 500);
    cam.lookAt(0, 0, 0);
    camRef.current = cam;
    set({ camera: cam });
  }, [size.width, size.height, set]);
  return null;
}

// ---------- Main modal ----------
type ArErrorKind =
  | "insecure" // page not on https / localhost
  | "unsupported" // navigator.mediaDevices missing (in-app browser, ancient device)
  | "permission" // NotAllowedError / SecurityError — user denied
  | "no-camera" // NotFoundError / OverconstrainedError
  | "camera-busy" // NotReadableError — camera in use elsewhere
  | "mp-failed" // MediaPipe fileset / model failed to load
  | "unknown";

function classifyMediaError(e: unknown): ArErrorKind {
  if (!(e instanceof Error)) return "unknown";
  const name = e.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "permission";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  if (name === "NotReadableError" || name === "TrackStartError") return "camera-busy";
  if (name === "TypeError") return "unsupported";
  return "unknown";
}

export default function ARTryOn({
  onClose,
  cameraStartAuthorized = false,
}: {
  onClose: () => void;
  cameraStartAuthorized?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const landmarkRef = useRef<{ x: number; y: number; z: number }[] | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "permission" | "tracking" | "no-hand" | "error"
  >(cameraStartAuthorized ? "loading" : "idle");
  const [cameraStarted, setCameraStarted] = useState(cameraStartAuthorized);
  const [errorKind, setErrorKind] = useState<ArErrorKind>("unknown");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [retryToken, setRetryToken] = useState(0);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [showCalibration, setShowCalibration] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [renderMode, setRenderMode] = useState<"3d" | "2d">("3d");
  const mirror = facing === "user";

  // Per-finger calibration profiles persist across sessions
  const [profile, setProfile] = useState<"ring" | "index" | "middle" | "pinky">("ring");
  const [settings, setSettings] = useState<ArSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_AR_SETTINGS;
    try {
      const raw = localStorage.getItem("ar-calibration-v1:ring");
      return raw ? { ...DEFAULT_AR_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AR_SETTINGS;
    } catch {
      return DEFAULT_AR_SETTINGS;
    }
  });
  const settingsRef = useRef<ArSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const debugRef = useRef<DebugFrame>({
    mcp: null,
    pip: null,
    center: null,
    xAxis: null,
    yAxis: null,
    phalanxLen: 0,
    scale: 0,
    active: false,
  });
  const stabilityRef = useRef<StabilityFrame>({
    stableMs: 0,
    isStable: false,
    centerVarPx: 0,
    scaleVarPct: 0,
  });

  // Auto-calibration: watches stability and triggers callback once when stable >1s
  const [autoCalOn, setAutoCalOn] = useState(false);
  const autoCalFiredRef = useRef(false);

  // Pose replay: record landmark frames, then scrub/play
  type ReplayFrame = { t: number; lms: { x: number; y: number; z: number }[] };
  const replayFramesRef = useRef<ReplayFrame[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const isRecordingRef = useRef(false);
  const replayModeRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  useEffect(() => {
    replayModeRef.current = replayMode;
  }, [replayMode]);
  const MAX_REPLAY_FRAMES = 240; // ~6s at 40fps

  // Swap profile → load its saved calibration
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`${CALIBRATION_STORAGE_PREFIX}${profile}`);
      setSettings(raw ? { ...DEFAULT_AR_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AR_SETTINGS);
    } catch {
      setSettings(DEFAULT_AR_SETTINGS);
    }
  }, [profile]);

  const patchSettings = (patch: Partial<ArSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const saveCalibration = () => {
    try {
      localStorage.setItem(`${CALIBRATION_STORAGE_PREFIX}${profile}`, JSON.stringify(settings));
      setToast(`Saved calibration · ${profile}`);
    } catch {
      setToast("Could not save calibration");
    }
  };
  const resetCalibration = () => {
    setSettings(DEFAULT_AR_SETTINGS);
    setToast("Calibration reset");
  };

  // --- Export / Import presets ---
  const exportPresets = () => {
    try {
      const payload: { version: number; exportedAt: string; profiles: Record<string, ArSettings> } =
        {
          version: CALIBRATION_EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          profiles: {},
        };
      for (const p of FINGER_PROFILES) {
        const raw = localStorage.getItem(`${CALIBRATION_STORAGE_PREFIX}${p}`);
        if (raw) {
          try {
            payload.profiles[p] = { ...DEFAULT_AR_SETTINGS, ...JSON.parse(raw) };
          } catch {
            /* skip */
          }
        }
      }
      // Include current unsaved settings for the active profile
      payload.profiles[profile] = settings;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ar-calibration-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("Exported calibration presets");
    } catch {
      setToast("Export failed");
    }
  };
  const importInputRef = useRef<HTMLInputElement>(null);
  const importPresets = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== "object" || !data.profiles) throw new Error("Invalid file");
        let count = 0;
        for (const p of FINGER_PROFILES) {
          const val = data.profiles[p];
          if (val && typeof val === "object") {
            const merged = { ...DEFAULT_AR_SETTINGS, ...val };
            localStorage.setItem(`${CALIBRATION_STORAGE_PREFIX}${p}`, JSON.stringify(merged));
            count++;
            if (p === profile) setSettings(merged);
          }
        }
        setToast(
          count > 0
            ? `Imported ${count} preset${count > 1 ? "s" : ""}`
            : "No presets found in file",
        );
      } catch {
        setToast("Import failed — invalid file");
      }
    };
    reader.onerror = () => setToast("Import failed — could not read file");
    reader.readAsText(file);
  };

  // --- Auto-calibration: snapshot current settings when pose stable ≥1s ---
  useEffect(() => {
    if (!autoCalOn) {
      autoCalFiredRef.current = false;
      return;
    }
    let raf = 0;
    const tick = () => {
      const s = stabilityRef.current;
      if (s.isStable && !autoCalFiredRef.current) {
        autoCalFiredRef.current = true;
        try {
          localStorage.setItem(
            `${CALIBRATION_STORAGE_PREFIX}${profile}`,
            JSON.stringify(settingsRef.current),
          );
          setToast(`Auto-calibrated · ${profile}`);
        } catch {
          setToast("Auto-calibrate save failed");
        }
        setAutoCalOn(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoCalOn, profile]);

  // --- Replay driver: when replayMode on, push replay frame into landmarkRef ---
  useEffect(() => {
    if (!replayMode) return;
    let raf = 0;
    const drive = () => {
      const frames = replayFramesRef.current;
      if (frames.length === 0) {
        landmarkRef.current = null;
      } else {
        const idx = Math.min(frames.length - 1, Math.max(0, replayIdx));
        landmarkRef.current = frames[idx].lms;
      }
      raf = requestAnimationFrame(drive);
    };
    raf = requestAnimationFrame(drive);
    return () => cancelAnimationFrame(raf);
  }, [replayMode, replayIdx]);

  // --- Replay auto-play ---
  useEffect(() => {
    if (!replayMode || !replayPlaying) return;
    const total = replayFramesRef.current.length;
    if (total === 0) return;
    const interval = setInterval(() => {
      setReplayIdx((i) => {
        const next = i + 1;
        return next >= total ? 0 : next;
      });
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, [replayMode, replayPlaying]);

  const startRecording = () => {
    replayFramesRef.current = [];
    setReplayCount(0);
    setReplayMode(false);
    setReplayPlaying(false);
    setReplayIdx(0);
    setIsRecording(true);
    setToast("Recording pose…");
  };
  const stopRecording = () => {
    setIsRecording(false);
    const n = replayFramesRef.current.length;
    setReplayCount(n);
    setToast(n > 0 ? `Recorded ${n} frames` : "No frames captured");
    if (n > 0) {
      setReplayMode(true);
      setReplayIdx(0);
    }
  };
  const clearReplay = () => {
    replayFramesRef.current = [];
    setReplayCount(0);
    setReplayIdx(0);
    setReplayMode(false);
    setReplayPlaying(false);
  };

  useEffect(() => {
    if (!cameraStarted) return;

    const resources = new CameraResourceLease<HandLandmarker>();
    let activeStream: MediaStream | null = null;
    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let cancelled = false;

    const detachVideo = () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      video.srcObject = null;
    };

    const shutdown = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resources.cancel();
      landmarker = null;
      landmarkRef.current = null;
      detachVideo();
    };

    const fail = (kind: ArErrorKind, msg: string) => {
      if (cancelled) return;
      shutdown();
      setErrorKind(kind);
      setErrorMsg(msg);
      setStatus("error");
    };

    const handlePageHide = () => {
      shutdown();
      setCameraStarted(false);
      setStatus("idle");
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      shutdown();
      setCameraStarted(false);
      setStatus("idle");
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    (async () => {
      // --- Preflight: HTTPS + mediaDevices support ---
      if (typeof window !== "undefined" && !window.isSecureContext) {
        fail(
          "insecure",
          "Camera access requires HTTPS. Load this page over https:// and try again.",
        );
        return;
      }
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        fail(
          "unsupported",
          "Your browser does not expose a camera API. Try Chrome, Safari, or Edge — in-app browsers (Instagram, TikTok, Facebook) usually block it.",
        );
        return;
      }

      // --- Camera ---
      try {
        setStatus("permission");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!resources.adoptStream(stream)) return;
        activeStream = stream;
      } catch (e) {
        console.error("Camera error:", e);
        const kind = classifyMediaError(e);
        const msg =
          kind === "permission"
            ? "Camera access was blocked. Enable it from your browser's address-bar site settings and retry."
            : kind === "no-camera"
              ? "No camera was detected on this device."
              : kind === "camera-busy"
                ? "Another app is using the camera. Close it (Zoom, Meet, FaceTime, …) and retry."
                : kind === "unsupported"
                  ? "Your browser does not support the camera API used for AR."
                  : e instanceof Error
                    ? e.message
                    : "Camera unavailable.";
        fail(kind, msg);
        return;
      }

      if (cancelled || !resources.isActive) return;
      const video = videoRef.current;
      if (!video) {
        fail("unknown", "Could not attach the camera preview. Try again.");
        return;
      }
      try {
        video.srcObject = activeStream;
        await video.play();
      } catch (e) {
        console.error("Video play error:", e);
        fail("unknown", "Could not start the camera preview. Try reloading the page.");
        return;
      }
      setVideoSize({ w: video.videoWidth, h: video.videoHeight });

      // --- MediaPipe ---
      setStatus("loading");
      try {
        const { FilesetResolver, HandLandmarker: HandLandmarkerRuntime } =
          await import("@mediapipe/tasks-vision");
        if (cancelled || !resources.isActive) return;
        // Self-hosted so the CSP stays 'self' (no external script-src) and AR
        // works offline / behind restrictive networks. Assets live in
        // public/mediapipe/{wasm,models}.
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        if (cancelled || !resources.isActive) return;
        const makeLandmarker = (delegate: "GPU" | "CPU") =>
          HandLandmarkerRuntime.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath: "/mediapipe/models/hand_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        // Prefer the GPU delegate; fall back to CPU on machines where the WebGL
        // GPU delegate can't initialize, so the engine still starts.
        let createdLandmarker: HandLandmarker;
        try {
          createdLandmarker = await makeLandmarker("GPU");
        } catch (gpuError) {
          console.warn("Hand landmarker GPU delegate failed, retrying on CPU", gpuError);
          if (cancelled || !resources.isActive) return;
          createdLandmarker = await makeLandmarker("CPU");
        }
        if (!resources.adoptModel(createdLandmarker)) return;
        landmarker = createdLandmarker;
      } catch (e) {
        console.error("MediaPipe load error:", e);
        fail(
          "mp-failed",
          "The hand-tracking engine failed to load. Check your internet connection and retry.",
        );
        return;
      }
      if (cancelled || !resources.isActive) return;

      setStatus("no-hand");

      const tick = () => {
        if (cancelled || !resources.isActive) return;
        if (!landmarker || !video.videoWidth) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        const ts = performance.now();
        let res: HandLandmarkerResult | null = null;
        try {
          res = landmarker.detectForVideo(video, ts);
        } catch {
          res = null;
        }
        if (res && res.landmarks && res.landmarks.length > 0) {
          const lms = res.landmarks[0] as { x: number; y: number; z: number }[];
          if (!replayModeRef.current) {
            landmarkRef.current = lms;
            setStatus((s) => (s === "tracking" ? s : "tracking"));
            if (isRecordingRef.current) {
              const arr = replayFramesRef.current;
              if (arr.length < MAX_REPLAY_FRAMES) {
                // Snapshot a copy so future MediaPipe reuse doesn't mutate it
                arr.push({ t: ts, lms: lms.map((p) => ({ x: p.x, y: p.y, z: p.z })) });
              }
            }
          }
        } else if (!replayModeRef.current) {
          landmarkRef.current = null;
          setStatus((s) => (s === "no-hand" ? s : "no-hand"));
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    })();

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      shutdown();
    };
  }, [cameraStarted, facing, retryToken]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const captureShot = async () => {
    try {
      const video = videoRef.current;
      const wrap = canvasWrapRef.current;
      const threeCanvas = wrap?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!video || !threeCanvas || !video.videoWidth) {
        setToast("Camera not ready yet");
        return;
      }
      // Output sized to video frame for max fidelity
      const W = video.videoWidth;
      const H = video.videoHeight;
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");
      if (!ctx) return;

      // Apply mirror only for front camera (selfie)
      ctx.save();
      if (mirror) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, W, H);
      ctx.restore();

      // 3D overlay: scale three canvas (CSS size) to video size
      ctx.drawImage(threeCanvas, 0, 0, W, H);

      // Flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 180);

      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ring-try-on-${Date.now()}.png`;
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
    <div className="fixed inset-0 z-[100] bg-obsidian/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" />
          <span className="text-xs uppercase tracking-[0.3em] text-gold truncate">
            AR Try-On · Live
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="hidden sm:inline-flex text-[10px] uppercase tracking-[0.25em] px-3 py-2 rounded-full border border-border/40 text-foreground/70 hover:text-gold hover:border-gold/50 transition"
            title="Switch camera"
          >
            ⇄ {facing === "user" ? "Front" : "Rear"}
          </button>
          <button
            onClick={() => setRenderMode((m) => (m === "3d" ? "2d" : "3d"))}
            className={`hidden sm:inline-flex text-[10px] uppercase tracking-[0.25em] px-3 py-2 rounded-full border transition ${
              renderMode === "2d"
                ? "border-gold/60 text-gold bg-gold/10"
                : "border-border/40 text-foreground/70 hover:text-gold hover:border-gold/50"
            }`}
            title="Toggle between live 3D ring and a 2D snapshot of the current configuration"
          >
            {renderMode === "2d" ? "▣ 2D" : "◈ 3D"}
          </button>
          <button
            onClick={() => setShowCalibration((v) => !v)}
            className={`text-[10px] uppercase tracking-[0.25em] px-3 py-2 rounded-full border transition ${
              showCalibration
                ? "border-gold/60 text-gold"
                : "border-border/40 text-foreground/70 hover:text-gold hover:border-gold/50"
            }`}
            title="Toggle finger placement guide"
          >
            ◎ Guide
          </button>
          {/* Capture — always visible & prominent (item 2/6) */}
          <button
            onClick={captureShot}
            disabled={status !== "tracking"}
            className="inline-flex items-center text-[10px] uppercase tracking-[0.25em] px-4 py-2 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian font-medium shadow-glow hover:scale-[1.03] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            title="Capture screenshot"
          >
            ⤓ Capture
          </button>
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="hidden sm:inline-flex text-[10px] uppercase tracking-[0.25em] px-3 py-2 rounded-full border border-border/40 text-foreground/70 hover:text-gold hover:border-gold/50 transition"
            title="Help & troubleshooting"
          >
            ? Help
          </button>
          <button
            onClick={() => setShowControls((v) => !v)}
            className={`hidden md:inline-flex text-[10px] uppercase tracking-[0.25em] px-3 py-2 rounded-full border transition ${
              showControls
                ? "border-gold/60 text-gold"
                : "border-border/40 text-foreground/70 hover:text-gold hover:border-gold/50"
            }`}
            title="AR controls & calibration"
          >
            ⚙ Adjust
          </button>
          <button
            onClick={() => patchSettings({ debug: !settings.debug })}
            className={`hidden md:inline-flex text-[10px] uppercase tracking-[0.25em] px-3 py-2 rounded-full border transition ${
              settings.debug
                ? "border-gold/60 text-gold"
                : "border-border/40 text-foreground/70 hover:text-gold hover:border-gold/50"
            }`}
            title="Toggle debug overlay"
          >
            ⌬ Debug
          </button>
          {/* Close — always visible & prominent (item 2/6) */}
          <button
            onClick={onClose}
            className="inline-flex items-center text-xs uppercase tracking-[0.25em] text-gold hover:text-obsidian hover:bg-gold transition px-4 py-2 rounded-full border border-gold/60"
            title="Close AR try-on"
          >
            Close ✕
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Mirrored video (selfie) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: mirror ? "scaleX(-1)" : "none" }}
        />
        {/* 3D overlay — kept mounted in 2D mode so hand-tracking still drives debugRef */}
        <div
          ref={canvasWrapRef}
          className="absolute inset-0"
          style={{ opacity: renderMode === "3d" ? 1 : 0 }}
        >
          <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
            <OrthoCam />
            <ambientLight intensity={0.9} />
            <directionalLight position={[200, 300, 400]} intensity={1.4} />
            <directionalLight position={[-200, 100, 200]} intensity={0.5} color="#c9a14a" />
            <Suspense fallback={null}>
              <HandTrackedRing
                landmarkRef={landmarkRef}
                mirror={mirror}
                settingsRef={settingsRef}
                debugRef={debugRef}
                stabilityRef={stabilityRef}
              />
              {/* Self-contained studio env (no external HDR fetch) so metals
                  reflect and diamonds refract even under a strict CSP / offline.
                  Replaces <Environment preset="studio" /> which fetched a CDN HDR
                  blocked by the production connect-src policy. */}
              <Environment resolution={256} frames={1}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                  <Lightformer
                    intensity={3}
                    form="rect"
                    position={[0, 6, 0]}
                    scale={[8, 8, 1]}
                    color="#fff6e6"
                  />
                  <Lightformer
                    intensity={2.2}
                    form="rect"
                    position={[5, 2, 4]}
                    scale={[4, 8, 1]}
                    color="#ffffff"
                  />
                  <Lightformer
                    intensity={2.2}
                    form="rect"
                    position={[-5, 2, 4]}
                    scale={[4, 8, 1]}
                    color="#ffffff"
                  />
                  <Lightformer
                    intensity={1.6}
                    form="rect"
                    position={[0, 1, -6]}
                    scale={[10, 6, 1]}
                    color="#d9c48a"
                  />
                </group>
              </Environment>
            </Suspense>
          </Canvas>
        </div>

        {/* 2D snapshot overlay of the currently-configured ring */}
        {renderMode === "2d" && <SnapshotOverlay debugRef={debugRef} />}

        {/* Calibration overlay — finger placement guide */}
        {showCalibration && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 400 600" className="w-[55%] max-w-[360px] h-auto opacity-70">
              <defs>
                <linearGradient id="cal-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gold, 45 80% 55%))" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="hsl(var(--gold, 45 80% 55%))" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Hand silhouette guide (palm + 5 fingers, ring finger highlighted) */}
              <g
                fill="none"
                stroke="url(#cal-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 6"
              >
                {/* Palm */}
                <path d="M 110 380 Q 100 470 140 540 L 260 540 Q 300 470 290 380 Z" />
                {/* Fingers */}
                <path d="M 130 380 L 120 200" /> {/* pinky */}
                <path d="M 170 380 L 165 130" /> {/* ring (highlighted below) */}
                <path d="M 210 380 L 215 100" /> {/* middle */}
                <path d="M 250 380 L 260 140" /> {/* index */}
                <path d="M 290 400 Q 330 380 320 320" /> {/* thumb */}
              </g>
              {/* Highlighted ring finger + target ring */}
              <g>
                <path
                  d="M 170 380 L 165 130"
                  fill="none"
                  stroke="hsl(45 90% 60%)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="167"
                  cy="320"
                  rx="28"
                  ry="10"
                  fill="none"
                  stroke="hsl(45 95% 65%)"
                  strokeWidth="3"
                />
                <ellipse
                  cx="167"
                  cy="320"
                  rx="40"
                  ry="14"
                  fill="none"
                  stroke="hsl(45 95% 65%)"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  opacity="0.6"
                >
                  <animate
                    attributeName="rx"
                    values="38;46;38"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="ry"
                    values="13;17;13"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.7;0.2;0.7"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              </g>
            </svg>
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 text-center max-w-xs px-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">
                Align your hand
              </p>
              <p className="text-xs text-foreground/70">
                Palm to camera, fingers up. Center your ring finger inside the dashed loop.
              </p>
            </div>
          </div>
        )}

        {/* Debug overlay */}
        {settings.debug && <DebugOverlay debugRef={debugRef} />}

        {/* AR controls & calibration panel */}
        {showControls && (
          <div className="absolute top-4 right-4 w-[300px] max-w-[85vw] max-h-[calc(100%-2rem)] overflow-y-auto bg-obsidian/90 backdrop-blur-md rounded-2xl border border-gold/30 shadow-elegant p-4 text-xs text-foreground/85 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold">AR Controls</p>
              <button
                onClick={() => setShowControls(false)}
                className="text-foreground/60 hover:text-gold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/60 block mb-1.5">
                Finger profile
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(["index", "middle", "ring", "pinky"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`text-[10px] uppercase tracking-wider py-1.5 rounded-md border transition ${
                      profile === p
                        ? "border-gold text-gold bg-gold/10"
                        : "border-border/40 text-foreground/60 hover:border-gold/40"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {(
              [
                { key: "bandThickness", label: "Band thickness", min: 0.5, max: 1.8, step: 0.02 },
                { key: "wrapAmount", label: "Wrap amount", min: 0.4, max: 1.6, step: 0.02 },
                { key: "tilt", label: "Ring tilt", min: -1.2, max: 1.2, step: 0.02 },
                {
                  key: "rotOffset",
                  label: "Rotation offset",
                  min: -Math.PI,
                  max: Math.PI,
                  step: 0.02,
                },
                { key: "scaleMul", label: "Scale", min: 0.6, max: 1.8, step: 0.02 },
                { key: "offsetX", label: "Offset X (px)", min: -80, max: 80, step: 1 },
                { key: "offsetY", label: "Offset Y (px)", min: -80, max: 80, step: 1 },
                { key: "smoothing", label: "Smoothing", min: 0.1, max: 0.9, step: 0.02 },
              ] as const
            ).map(({ key, label, min, max, step }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                    {label}
                  </label>
                  <span className="font-mono text-[10px] text-gold">
                    {Number(settings[key]).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[key] as number}
                  onChange={(e) =>
                    patchSettings({ [key]: parseFloat(e.target.value) } as Partial<ArSettings>)
                  }
                  className="w-full accent-[hsl(45_90%_55%)]"
                />
              </div>
            ))}

            {/* Occlusion mode */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/60 block mb-1.5">
                Occlusion
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["off", "fast", "quality"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => patchSettings({ occlusionMode: m })}
                    className={`text-[10px] uppercase tracking-wider py-1.5 rounded-md border transition ${
                      settings.occlusionMode === m
                        ? "border-gold text-gold bg-gold/10"
                        : "border-border/40 text-foreground/60 hover:border-gold/40"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-foreground/50 mt-1">
                Fast = low-poly cylinder. Quality = tapered capsule with rounded caps (cleaner
                edges, more GPU).
              </p>
            </div>

            {/* Auto-calibration */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                  Auto-calibrate
                </label>
                <span className="font-mono text-[10px] text-gold">
                  {autoCalOn ? `${(stabilityRef.current.stableMs / 1000).toFixed(1)}s` : "idle"}
                </span>
              </div>
              <button
                onClick={() => {
                  autoCalFiredRef.current = false;
                  setAutoCalOn((v) => !v);
                }}
                className={`w-full text-[10px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border transition ${
                  autoCalOn
                    ? "border-gold text-gold bg-gold/10 animate-pulse"
                    : "border-border/50 text-foreground/70 hover:border-gold/50 hover:text-gold"
                }`}
              >
                {autoCalOn ? "Watching · hold hand still…" : "◉ Auto-calibrate (1s hold)"}
              </button>
              <p className="text-[10px] text-foreground/50 mt-1">
                Hold your hand still for 1s to snapshot position, rotation, and scale into this
                finger profile.
              </p>
            </div>

            {/* Pose replay */}
            <div className="pt-1">
              <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/60 block mb-1.5">
                Pose replay
              </label>
              <div className="flex gap-1">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex-1 text-[10px] uppercase tracking-[0.2em] px-2 py-2 rounded-md border border-border/50 text-foreground/70 hover:border-gold/50 hover:text-gold transition"
                  >
                    ● Record
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex-1 text-[10px] uppercase tracking-[0.2em] px-2 py-2 rounded-md border border-destructive text-destructive bg-destructive/10 animate-pulse"
                  >
                    ■ Stop ({replayFramesRef.current.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setReplayMode((v) => !v);
                    setReplayPlaying(false);
                  }}
                  disabled={replayCount === 0}
                  className={`text-[10px] uppercase tracking-[0.2em] px-2 py-2 rounded-md border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    replayMode
                      ? "border-gold text-gold bg-gold/10"
                      : "border-border/50 text-foreground/70 hover:border-gold/50 hover:text-gold"
                  }`}
                >
                  {replayMode ? "Live" : "Scrub"}
                </button>
                <button
                  onClick={clearReplay}
                  disabled={replayCount === 0}
                  className="text-[10px] uppercase tracking-[0.2em] px-2 py-2 rounded-md border border-border/50 text-foreground/70 hover:border-destructive hover:text-destructive transition disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-foreground/50 mt-1">
                Record a few seconds of landmarks, then scrub to verify the wrap transform
                frame-by-frame.
              </p>
            </div>

            {/* Export / Import */}
            <div className="pt-1">
              <label className="text-[10px] uppercase tracking-[0.2em] text-foreground/60 block mb-1.5">
                Presets
              </label>
              <div className="flex gap-2">
                <button
                  onClick={exportPresets}
                  className="flex-1 text-[10px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border border-border/50 text-foreground/70 hover:border-gold/50 hover:text-gold transition"
                >
                  ⤓ Export
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="flex-1 text-[10px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border border-border/50 text-foreground/70 hover:border-gold/50 hover:text-gold transition"
                >
                  ⤒ Import
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importPresets(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-[10px] text-foreground/50 mt-1">
                Share JSON presets across devices and lighting setups. Imports overwrite matching
                finger profiles.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveCalibration}
                className="flex-1 text-[10px] uppercase tracking-[0.2em] px-3 py-2 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian font-medium hover:scale-[1.02] transition"
              >
                Save
              </button>
              <button
                onClick={resetCalibration}
                className="text-[10px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border border-border/50 text-foreground/70 hover:border-gold/50 hover:text-gold transition"
              >
                Reset
              </button>
            </div>
            <p className="text-[10px] text-foreground/50 leading-relaxed">
              Adjust per finger and lighting. Calibration is saved locally in your browser.
            </p>
          </div>
        )}

        {/* Replay scrubber (floating bottom bar) */}
        {replayMode && replayCount > 0 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-obsidian/90 backdrop-blur-md rounded-2xl border border-gold/30 shadow-elegant px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setReplayPlaying((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-full border border-gold/50 text-gold hover:bg-gold/10 transition"
            >
              {replayPlaying ? "⏸" : "▶"}
            </button>
            <input
              type="range"
              min={0}
              max={replayCount - 1}
              step={1}
              value={replayIdx}
              onChange={(e) => {
                setReplayPlaying(false);
                setReplayIdx(parseInt(e.target.value, 10));
              }}
              className="flex-1 accent-[hsl(45_90%_55%)]"
            />
            <span className="font-mono text-[10px] text-gold shrink-0">
              {replayIdx + 1}/{replayCount}
            </span>
          </div>
        )}

        {/* Status overlays */}
        {status !== "tracking" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-glass rounded-2xl px-6 py-4 text-center max-w-sm pointer-events-auto">
              {status === "idle" && (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">
                    Camera preview
                  </p>
                  <p className="text-sm text-foreground/70 mb-2">
                    Camera access starts only after you choose Start Camera.
                  </p>
                  <p className="text-xs text-foreground/55 mb-4">
                    Frames are processed locally for this preview and are not uploaded by the
                    try-on.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setStatus("loading");
                      setCameraStarted(true);
                    }}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian text-xs uppercase tracking-[0.2em] font-medium shadow-glow"
                  >
                    Start Camera
                  </button>
                </>
              )}
              {status === "permission" && (
                <p className="text-sm text-foreground/80">
                  Allow camera access to try the ring on…
                </p>
              )}
              {status === "loading" && (
                <p className="text-sm text-foreground/80">Loading hand-tracking engine…</p>
              )}
              {status === "no-hand" && (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">
                    Show your hand
                  </p>
                  <p className="text-sm text-foreground/70">
                    Hold your hand up to the camera with your palm facing you, fingers spread.
                  </p>
                </>
              )}
              {status === "error" &&
                (() => {
                  const titleMap: Record<ArErrorKind, string> = {
                    insecure: "Insecure connection",
                    unsupported: "Browser not supported",
                    permission: "Camera access blocked",
                    "no-camera": "No camera detected",
                    "camera-busy": "Camera in use",
                    "mp-failed": "Tracking engine failed",
                    unknown: "AR could not start",
                  };
                  const canRetry = errorKind !== "insecure" && errorKind !== "unsupported";
                  return (
                    <>
                      <p className="text-xs uppercase tracking-[0.3em] text-destructive mb-2">
                        {titleMap[errorKind]}
                      </p>
                      <p className="text-sm text-foreground/70 mb-4">
                        {errorMsg || "Please enable camera permissions and reload."}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {canRetry && (
                          <button
                            onClick={() => {
                              setStatus("loading");
                              setErrorMsg("");
                              setRetryToken((n) => n + 1);
                            }}
                            className="text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian font-medium shadow-glow hover:scale-[1.03] transition-transform"
                          >
                            ↻ Retry
                          </button>
                        )}
                        <button
                          onClick={() => setShowHelp(true)}
                          className="text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border border-gold/50 text-gold hover:bg-gold/10 transition"
                        >
                          Troubleshoot →
                        </button>
                        <button
                          onClick={onClose}
                          className="text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border border-border/50 text-foreground/70 hover:text-foreground hover:border-foreground/40 transition"
                        >
                          ← Back to preview
                        </button>
                      </div>
                    </>
                  );
                })()}
            </div>
          </div>
        )}

        {/* Capture flash */}
        {flash && (
          <div
            className="absolute inset-0 bg-white animate-pulse pointer-events-none"
            style={{ opacity: 0.8 }}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-glass rounded-full px-4 py-2 text-xs text-foreground/90 border border-gold/40 shadow-glow">
            {toast}
          </div>
        )}

        {/* Help / troubleshooting drawer */}
        {showHelp && (
          <div className="absolute inset-0 bg-obsidian/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="bg-glass rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-border/40 shadow-elegant my-auto">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">
                    Help Center
                  </p>
                  <h3 className="text-2xl">AR try-on troubleshooting</h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-xs uppercase tracking-[0.25em] text-foreground/70 hover:text-gold transition px-3 py-1.5 rounded-full border border-border/40 hover:border-gold/50"
                >
                  Close ✕
                </button>
              </div>

              <div className="space-y-5 text-sm text-foreground/80">
                <section>
                  <h4 className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
                    Camera permission
                  </h4>
                  <ul className="space-y-1.5 text-foreground/75 list-disc pl-5">
                    <li>
                      Click the <strong>camera / lock icon</strong> in your browser's address bar
                      and set Camera to <strong>Allow</strong>.
                    </li>
                    <li>
                      On iOS Safari: Settings → Safari → Camera → <strong>Allow</strong>. Then
                      reload the page.
                    </li>
                    <li>
                      On Android Chrome: Site settings (lock icon) → Permissions → Camera →{" "}
                      <strong>Allow</strong>.
                    </li>
                    <li>
                      If another app is using the camera (Zoom, Meet, FaceTime), close it and try
                      again.
                    </li>
                    <li>
                      AR try-on requires an <strong>HTTPS</strong> page — `http://` sites cannot
                      access the camera.
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
                    Supported browsers
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2 text-foreground/75">
                    <div className="bg-obsidian/40 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1">
                        Desktop
                      </p>
                      <p>Chrome 90+, Edge 90+, Safari 16+, Firefox 110+</p>
                    </div>
                    <div className="bg-obsidian/40 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1">
                        Mobile
                      </p>
                      <p>iOS Safari 16+, Android Chrome 90+, Samsung Internet 20+</p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/55 mt-2">
                    In-app browsers (Instagram, Facebook, TikTok) often block camera access — open
                    this page in Safari or Chrome instead.
                  </p>
                </section>

                <section>
                  <h4 className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
                    Tips for accurate tracking
                  </h4>
                  <ul className="space-y-1.5 text-foreground/75 list-disc pl-5">
                    <li>
                      Stand in <strong>bright, even lighting</strong> — avoid backlight from
                      windows.
                    </li>
                    <li>Show your palm to the camera, fingers spread, ~25–40 cm away.</li>
                    <li>Use the on-screen guide (◎ Guide) to align your ring finger.</li>
                    <li>Avoid busy backgrounds; a plain wall works best.</li>
                    <li>Move slowly — fast motion can cause the ring to lag a frame.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xs uppercase tracking-[0.25em] text-gold mb-2">
                    Still not working?
                  </h4>
                  <p className="text-foreground/75">
                    Try reloading the page, switching browsers, or restarting your device. On older
                    phones, hand-tracking may run slowly — try lower resolution lighting or use a
                    desktop.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-foreground/50 bg-glass rounded-full px-4 py-2">
          {status === "tracking"
            ? "● Tracking · move your hand slowly"
            : "Powered by MediaPipe + WebGL"}
        </div>
      </div>
    </div>
  );
}
