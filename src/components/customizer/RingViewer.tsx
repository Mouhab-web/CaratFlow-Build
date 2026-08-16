import { Suspense, useMemo, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Center,
  ContactShadows,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
import { diameterToViewerScale } from "@/lib/ringSize";

function applyMetal(scene: THREE.Object3D, metal: keyof typeof METAL_COLOR) {
  const m = METAL_COLOR[metal];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        const name = (mat.name || "").toLowerCase();
        // Skip diamond/stone materials (keep transparent crystal look). The
        // __diamondEnhanced flag is the definitive guard: once enhanceDiamonds
        // has upgraded a stone we must never recolor it, otherwise switching to
        // a gold metal would tint the diamond gold.
        if (
          (mat.userData as { __diamondEnhanced?: boolean }).__diamondEnhanced ||
          name.includes("diamond") ||
          name.includes("stone") ||
          name.includes("gem") ||
          name.includes("crystal") ||
          std.transparent
        )
          return;
        std.color = new THREE.Color(m.color);
        std.metalness = m.metalness;
        std.roughness = m.roughness;
        // Leave envMapIntensity at the material default (1) — same as
        // ring-customizer. The neutral studio HDR provides enough reflection;
        // boosting it only exaggerated the environment's tint on the metal.
        std.needsUpdate = true;
      });
    }
  });
}

// Neutral studio environment generated at runtime from three's built-in
// RoomEnvironment — NO external HDR/CDN fetch (drei's <Environment preset> was
// failing the demo when the CDN was unreachable). This is the same neutral env
// the offscreen snapshot renderer uses. A neutral env is what makes a
// metalness:1 platinum reflect as true silver instead of picking up a gold tint.
function RoomEnv() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const previous = scene.environment;
    scene.environment = texture;
    return () => {
      scene.environment = previous;
      texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function GLBModel({ url, scale }: { url: string; scale?: [number, number, number] }) {
  const { scene } = useGLTF(url);
  const metal = useRing((s) => s.metal);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    applyMetal(cloned, metal);
    import("@/lib/ring-materials").then(({ enhanceDiamonds }) => enhanceDiamonds(cloned));
  }, [cloned, metal]);
  return <primitive object={cloned} scale={scale || [1, 1, 1]} />;
}

function RingScene() {
  const { band, shape, setting, halo, sideStone, carat, ringSize } = useRing();
  const bandFile = BANDS.find((b) => b.id === band)?.file;
  const settingFile = SETTINGS.find((s) => s.id === setting)?.file;
  const shapeFile = SHAPES.find((s) => s.id === shape)?.file;
  const haloFile = getHaloFile(halo, shape);
  const sideStoneFile = SIDE_STONES.find((s) => s.id === sideStone)?.file;
  const cs = CARAT_SCALE_MAP[carat] || 1;
  const ringScale = ringSize ? diameterToViewerScale(ringSize.diameter_mm) : 1;

  return (
    <Center>
      <group scale={[ringScale, ringScale, ringScale]}>
        {bandFile && <GLBModel url={bandFile} />}
        {settingFile && <GLBModel url={settingFile} />}
        {shapeFile && <GLBModel url={shapeFile} scale={[cs, cs, cs]} />}
        {haloFile && <GLBModel url={haloFile} />}
        {sideStoneFile && <GLBModel url={sideStoneFile} />}
      </group>
    </Center>
  );
}

function ViewerProgress() {
  const { active, progress, errors } = useProgress();
  if (!active && errors.length === 0) return null;
  return (
    <div
      className="absolute inset-x-4 top-4 z-10 rounded-xl border border-white/20 bg-black/75 px-4 py-3 text-xs text-white"
      role={errors.length ? "alert" : "status"}
      aria-live="polite"
    >
      {errors.length
        ? "A ring asset could not load. Use the static summary below or retry the demo."
        : `Loading ring assets… ${Math.round(progress)}%`}
    </div>
  );
}

export default function RingViewer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [interacted, setInteracted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && document.visibilityState === "visible"),
      { threshold: 0.01 },
    );
    observer.observe(node);
    const onVisibility = () =>
      setVisible(
        document.visibilityState === "visible" &&
          node.getBoundingClientRect().bottom > 0 &&
          node.getBoundingClientRect().top < window.innerHeight,
      );
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const animate = visible && !reducedMotion;
  return (
    <div ref={rootRef} className="relative h-full w-full" onPointerDown={() => setInteracted(true)}>
      <Canvas
        camera={{ position: [0, 1.4, 4.5], fov: 42 }}
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#101712"]} />
        <fog attach="fog" args={["#101712", 8, 18]} />
        {/* Lighting rig matched 1:1 to ring-customizer (the reference that
            renders platinum as true silver). No warm hemisphere light. */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#c9a14a" />
        <spotLight position={[0, 6, 0]} angle={0.4} intensity={0.8} penumbra={1} />
        <RoomEnv />
        <Suspense fallback={null}>
          <RingScene />
          <ContactShadows position={[0, -1.2, 0]} opacity={0.4} blur={2.5} scale={6} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={8}
          autoRotate={animate && !interacted}
          autoRotateSpeed={0.65}
          onStart={() => setInteracted(true)}
        />
      </Canvas>
      <ViewerProgress />
    </div>
  );
}
