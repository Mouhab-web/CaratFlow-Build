import * as THREE from "three";

/**
 * Upgrade any material that looks like a diamond/gem to a MeshPhysicalMaterial
 * with realistic transmission + dispersion approximation + strong environment
 * reflections. Idempotent — checks a userData flag.
 */
export function enhanceDiamonds(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const upgraded = mats.map((mat) => {
      const name = (mat.name || "").toLowerCase();
      const looksLikeDiamond =
        name.includes("diamond") ||
        name.includes("stone") ||
        name.includes("gem") ||
        name.includes("crystal") ||
        (mat as THREE.MeshStandardMaterial).transparent === true;
      if (!looksLikeDiamond) return mat;
      if ((mat.userData as { __diamondEnhanced?: boolean }).__diamondEnhanced) return mat;

      const phys = new THREE.MeshPhysicalMaterial({
        name: mat.name,
        color: new THREE.Color("#ffffff"),
        metalness: 0,
        roughness: 0.02,
        transmission: 1,
        // Thinner walls + longer attenuation keep the stone bright and clear
        // rather than tinting toward the dark backdrop it transmits.
        thickness: 0.5,
        ior: 2.417, // diamond
        attenuationColor: new THREE.Color("#f4fbff"),
        attenuationDistance: 6,
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        // Strong env reflections are what read as "sparkle" against a dark scene
        // and keep facets lively even where the transmission pass is weak.
        envMapIntensity: 3,
        specularIntensity: 1,
        specularColor: new THREE.Color("#ffffff"),
        iridescence: 0.35,
        iridescenceIOR: 1.6,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });
      phys.userData.__diamondEnhanced = true;
      return phys;
    });
    mesh.material = Array.isArray(mesh.material) ? upgraded : upgraded[0];
  });
}
