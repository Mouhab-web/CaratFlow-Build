// Offscreen renderer: converts the current 3D ring configuration into a 2D PNG
// snapshot, suitable for use as an <img> overlay in AR Try-On.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  BANDS, SETTINGS, SHAPES, SIDE_STONES, CARAT_SCALE_MAP,
  getHaloFile, METAL_COLOR, type Metal,
} from "./ring-config";
import { enhanceDiamonds } from "./ring-materials";

export type SnapshotConfig = {
  metal: Metal;
  band: string | null;
  shape: string | null;
  setting: string | null;
  halo: string | null;
  sideStone: string | null;
  carat: number;
};

function applyMetal(scene: THREE.Object3D, metal: Metal) {
  const m = METAL_COLOR[metal];
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      const name = (mat.name || "").toLowerCase();
      if (name.includes("diamond") || name.includes("stone") || name.includes("gem") || std.transparent) return;
      std.color = new THREE.Color(m.color);
      std.metalness = m.metalness;
      std.roughness = m.roughness;
      std.needsUpdate = true;
    });
  });
}

const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<THREE.Group>>();
function loadGLB(url: string): Promise<THREE.Group> {
  let p = gltfCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      loader.load(url, (g) => resolve(g.scene), undefined, reject);
    });
    gltfCache.set(url, p);
  }
  return p.then((scene) => scene.clone(true));
}

export async function renderRingSnapshot(
  cfg: SnapshotConfig,
  size = 512,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const warm = new THREE.DirectionalLight(0xc9a14a, 0.6);
  warm.position.set(-3, 2, -2);
  scene.add(warm);

  const group = new THREE.Group();
  scene.add(group);

  const bandFile = BANDS.find((b) => b.id === cfg.band)?.file;
  const settingFile = SETTINGS.find((s) => s.id === cfg.setting)?.file;
  const shapeFile = SHAPES.find((s) => s.id === cfg.shape)?.file;
  const haloFile = getHaloFile(cfg.halo, cfg.shape);
  const sideStoneFile = SIDE_STONES.find((s) => s.id === cfg.sideStone)?.file;
  const cs = CARAT_SCALE_MAP[cfg.carat] || 1;

  const parts: { url: string; scale?: number }[] = [];
  if (bandFile) parts.push({ url: bandFile });
  if (settingFile) parts.push({ url: settingFile });
  if (shapeFile) parts.push({ url: shapeFile, scale: cs });
  if (haloFile) parts.push({ url: haloFile });
  if (sideStoneFile) parts.push({ url: sideStoneFile });

  const loaded = await Promise.all(parts.map((p) => loadGLB(p.url).then((s) => ({ s, scale: p.scale }))));
  loaded.forEach(({ s, scale }) => {
    applyMetal(s, cfg.metal);
    enhanceDiamonds(s);
    if (scale) s.scale.setScalar(scale);
    group.add(s);
  });

  // Center & frame
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  group.position.sub(center);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = sphere.radius || 1;

  // Camera framing so ring hole faces camera (front view along +Z)
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  const dist = radius / Math.tan((camera.fov * Math.PI) / 360) * 1.15;
  camera.position.set(0, 0.1 * radius, dist);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  const dataUrl = canvas.toDataURL("image/png");

  // Cleanup
  renderer.dispose();
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mm) => mm && (mm as THREE.Material).dispose());
    }
  });

  return dataUrl;
}
