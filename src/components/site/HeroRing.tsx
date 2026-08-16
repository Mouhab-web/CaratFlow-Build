import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer, useGLTF, Center, Float } from "@react-three/drei";
import * as THREE from "three";
import { METAL_COLOR } from "@/lib/ring-config";

// Fixed, premium default so the hero always shows a polished gold solitaire —
// independent of the customizer store below it.
const HERO_METAL: keyof typeof METAL_COLOR = "Yellow Gold 18K";
const HERO_PARTS = [
  "/assets/bands/standard-ring.glb",
  "/assets/settings/4-prong.glb",
  "/assets/shape/round.glb",
];

// Mirrors the customizer viewer: recolor metals, never touch diamonds/gems.
function applyMetal(scene: THREE.Object3D) {
  const m = METAL_COLOR[HERO_METAL];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      const name = (mat.name || "").toLowerCase();
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
      std.envMapIntensity = 1.35;
      std.needsUpdate = true;
    });
  });
}

function HeroGLB({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    applyMetal(cloned);
    import("@/lib/ring-materials").then(({ enhanceDiamonds }) => enhanceDiamonds(cloned));
  }, [cloned]);
  return <primitive object={cloned} />;
}

function HeroScene() {
  return (
    <Center>
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.2}>
        <group>
          {HERO_PARTS.map((url) => (
            <HeroGLB key={url} url={url} />
          ))}
        </group>
      </Float>
    </Center>
  );
}

export default function HeroRing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && document.visibilityState === "visible"),
      { threshold: 0.01 },
    );
    observer.observe(node);
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={rootRef} className="hero-ring__canvas">
      <Canvas
        camera={{ position: [0, 1.1, 4.4], fov: 42 }}
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#fff8e9", "#17382e", 0.6]} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#c9a14a" />
        <spotLight position={[0, 6, 0]} angle={0.4} intensity={0.7} penumbra={1} />
        {/* Self-contained studio env (no external HDR) so metals reflect and the
            transmission diamond refracts — same approach as the customizer. */}
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
            <Lightformer
              intensity={1.4}
              form="ring"
              position={[3, -3, 3]}
              scale={3}
              color="#ffe9c7"
            />
          </group>
        </Environment>
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.1}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.9}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/assets/bands/standard-ring.glb");
useGLTF.preload("/assets/settings/4-prong.glb");
useGLTF.preload("/assets/shape/round.glb");
