// Ring builder asset config — derived from GLB files in /public/assets

export type Metal =
  | "Platinum"
  | "White Gold 14K"
  | "White Gold 18K"
  | "Yellow Gold 14K"
  | "Yellow Gold 18K"
  | "Rose Gold 14K"
  | "Rose Gold 18K";

export const METALS: { id: Metal; label: string; color: string }[] = [
  { id: "Platinum", label: "Platinum", color: "#e5e4e2" },
  { id: "White Gold 14K", label: "White Gold 14K", color: "#ecebe6" },
  { id: "White Gold 18K", label: "White Gold 18K", color: "#f4f3ee" },
  { id: "Yellow Gold 14K", label: "Yellow Gold 14K", color: "#dbb45a" },
  { id: "Yellow Gold 18K", label: "Yellow Gold 18K", color: "#ecc547" },
  { id: "Rose Gold 14K", label: "Rose Gold 14K", color: "#d99a90" },
  { id: "Rose Gold 18K", label: "Rose Gold 18K", color: "#e8aa9e" },
];

export const BANDS = [
  { id: "Standard ring", label: "Standard", file: "/assets/bands/standard-ring.glb" },
  { id: "Diamond Eternity", label: "Diamond Eternity", file: "/assets/bands/diamond-eternity.glb" },
  { id: "Diamond 3-Sided", label: "Diamond 3-Sided", file: "/assets/bands/diamond-3-sided.glb" },
  { id: "Petite Cathedral", label: "Petite Cathedral", file: "/assets/bands/petite-cathedral.glb" },
  { id: "Petite Eternity", label: "Petite Eternity", file: "/assets/bands/petite-eternity.glb" },
  { id: "Petite 3-Sided", label: "Petite 3-Sided", file: "/assets/bands/petite-3-sided.glb" },
  { id: "Split Shank", label: "Split Shank", file: "/assets/bands/split-shank.glb" },
  {
    id: "Split Shank Diamond",
    label: "Split Shank Diamond",
    file: "/assets/bands/split-shank-diamond.glb",
  },
] as const;

export const SETTINGS = [
  { id: "4 Prong", label: "4 Prong", file: "/assets/settings/4-prong.glb" },
  { id: "6 Prong", label: "6 Prong", file: "/assets/settings/6-prong.glb" },
  { id: "Bezel Set", label: "Bezel Set", file: "/assets/settings/bezel-set.glb" },
] as const;

export const SHAPES = [
  { id: "Round", label: "Round", file: "/assets/shape/round.glb" },
  { id: "Princess", label: "Princess", file: "/assets/shape/princess.glb" },
  { id: "Cushion", label: "Cushion", file: "/assets/shape/cushion.glb" },
  { id: "Oval", label: "Oval", file: "/assets/shape/oval.glb" },
  { id: "Emerald", label: "Emerald", file: "/assets/shape/emerald.glb" },
  { id: "Asscher", label: "Asscher", file: "/assets/shape/asscher.glb" },
  { id: "Radiant", label: "Radiant", file: "/assets/shape/radiant.glb" },
  { id: "Pear", label: "Pear", file: "/assets/shape/pear.glb" },
  { id: "Marquise", label: "Marquise", file: "/assets/shape/marquise.glb" },
] as const;

export const SIDE_STONES = [
  { id: "Baguette", label: "Baguette", file: "/assets/side-stones/baguette.glb" },
  { id: "Half Moon", label: "Half Moon", file: "/assets/side-stones/half-moon.glb" },
  { id: "Trapezoid", label: "Trapezoid", file: "/assets/side-stones/trapezoid.glb" },
  { id: "Oval", label: "Oval", file: "/assets/side-stones/oval.glb" },
  { id: "Pear", label: "Pear", file: "/assets/side-stones/pear.glb" },
] as const;

export const HALO_TYPES = [
  { id: "Pave", label: "Pavé" },
  { id: "Hidden", label: "Hidden" },
  { id: "Ballerina", label: "Ballerina" },
  { id: "Tiara Half", label: "Tiara Half" },
] as const;

export type BandId = (typeof BANDS)[number]["id"];
export type SettingId = (typeof SETTINGS)[number]["id"];
export type ShapeId = (typeof SHAPES)[number]["id"];
export type SideStoneId = (typeof SIDE_STONES)[number]["id"];
export type HaloType = (typeof HALO_TYPES)[number]["id"];

const SHARED_PAVE_FILE = "/assets/halo/pave/pave-asscher_princess_cushion_radiant.glb";
const TIARA_HALF_FILE = "/assets/halo/tiara-half/tiara-half.glb";

/**
 * Explicit mappings are intentional. Filename synthesis previously made the
 * Emerald Hidden and Ballerina choices request nonexistent "combined" files.
 * Emerald reuses the existing Radiant mount for those two rectangular
 * treatments; Pavé retains its shared multi-shape asset.
 */
export const HALO_FILES: Record<HaloType, Record<ShapeId, string>> = {
  Pave: {
    Round: "/assets/halo/pave/pave-round.glb",
    Princess: SHARED_PAVE_FILE,
    Cushion: SHARED_PAVE_FILE,
    Oval: "/assets/halo/pave/pave-oval.glb",
    Emerald: SHARED_PAVE_FILE,
    Asscher: SHARED_PAVE_FILE,
    Radiant: SHARED_PAVE_FILE,
    Pear: "/assets/halo/pave/pave-pear.glb",
    Marquise: "/assets/halo/pave/pave-marquise.glb",
  },
  Hidden: {
    Round: "/assets/halo/hidden/hidden-round.glb",
    Princess: "/assets/halo/hidden/hidden-princess.glb",
    Cushion: "/assets/halo/hidden/hidden-cushion.glb",
    Oval: "/assets/halo/hidden/hidden-oval.glb",
    Emerald: "/assets/halo/hidden/hidden-radiant.glb",
    Asscher: "/assets/halo/hidden/hidden-asscher.glb",
    Radiant: "/assets/halo/hidden/hidden-radiant.glb",
    Pear: "/assets/halo/hidden/hidden-pear.glb",
    Marquise: "/assets/halo/hidden/hidden-marquise.glb",
  },
  Ballerina: {
    Round: "/assets/halo/ballerina/ballerina-round.glb",
    Princess: "/assets/halo/ballerina/ballerina-princess.glb",
    Cushion: "/assets/halo/ballerina/ballerina-cushion.glb",
    Oval: "/assets/halo/ballerina/ballerina-oval.glb",
    Emerald: "/assets/halo/ballerina/ballerina-radiant.glb",
    Asscher: "/assets/halo/ballerina/ballerina-asscher.glb",
    Radiant: "/assets/halo/ballerina/ballerina-radiant.glb",
    Pear: "/assets/halo/ballerina/ballerina-pear.glb",
    Marquise: "/assets/halo/ballerina/ballerina-marquise.glb",
  },
  "Tiara Half": {
    Round: TIARA_HALF_FILE,
    Princess: TIARA_HALF_FILE,
    Cushion: TIARA_HALF_FILE,
    Oval: TIARA_HALF_FILE,
    Emerald: TIARA_HALF_FILE,
    Asscher: TIARA_HALF_FILE,
    Radiant: TIARA_HALF_FILE,
    Pear: TIARA_HALF_FILE,
    Marquise: TIARA_HALF_FILE,
  },
};

export function getHaloFile(haloType: string | null, shape: string | null): string | null {
  if (!haloType || !shape) return null;
  const knownHalo = HALO_TYPES.find((candidate) => candidate.id === haloType)?.id;
  const knownShape = SHAPES.find((candidate) => candidate.id === shape)?.id;
  if (!knownHalo || !knownShape) return null;
  return HALO_FILES[knownHalo][knownShape] ?? null;
}

export function getAvailableHaloTypes(shape: string | null) {
  if (!shape) return [];
  return HALO_TYPES.filter((halo) => getHaloFile(halo.id, shape) !== null);
}

export const CARAT_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
export const CARAT_SCALE_MAP: Record<number, number> = {
  0.5: 0.78,
  0.75: 0.9,
  1: 1,
  1.25: 1.1,
  1.5: 1.18,
  2: 1.32,
  2.5: 1.45,
  3: 1.58,
};

export const METAL_COLOR: Record<Metal, { color: string; metalness: number; roughness: number }> = {
  Platinum: { color: "#e5e4e2", metalness: 1, roughness: 0.18 },
  "White Gold 14K": { color: "#ecebe6", metalness: 1, roughness: 0.24 },
  "White Gold 18K": { color: "#f4f3ee", metalness: 1, roughness: 0.2 },
  "Yellow Gold 14K": { color: "#dbb45a", metalness: 1, roughness: 0.26 },
  "Yellow Gold 18K": { color: "#ecc547", metalness: 1, roughness: 0.2 },
  "Rose Gold 14K": { color: "#d99a90", metalness: 1, roughness: 0.26 },
  "Rose Gold 18K": { color: "#e8aa9e", metalness: 1, roughness: 0.2 },
};

// Compatibility
const ETERNITY: readonly BandId[] = ["Diamond Eternity", "Petite Eternity"];
const PETITE: readonly BandId[] = ["Petite Cathedral", "Petite Eternity", "Petite 3-Sided"];

export function getAllowedSideStones(bandId: string | null) {
  const knownBand = BANDS.find((band) => band.id === bandId)?.id;
  if (!knownBand) return [];
  if (ETERNITY.includes(knownBand)) return [];
  if (PETITE.includes(knownBand))
    return SIDE_STONES.filter((stone) => stone.id === "Oval" || stone.id === "Baguette");
  return SIDE_STONES;
}

export function repairSideStoneForBand(
  bandId: string | null,
  sideStoneId: string | null,
): SideStoneId | null {
  if (!sideStoneId) return null;
  return getAllowedSideStones(bandId).find((stone) => stone.id === sideStoneId)?.id ?? null;
}

export type RingConfiguration = {
  metal: Metal;
  band: BandId;
  setting: SettingId;
  shape: ShapeId;
  carat: (typeof CARAT_OPTIONS)[number];
  halo: HaloType | null;
  sideStone: SideStoneId | null;
};

export function* enumerateRingConfigurations(): Generator<RingConfiguration> {
  for (const metal of METALS) {
    for (const band of BANDS) {
      const sideStones: readonly (SideStoneId | null)[] = [
        null,
        ...getAllowedSideStones(band.id).map((stone) => stone.id),
      ];
      for (const sideStone of sideStones) {
        for (const setting of SETTINGS) {
          for (const shape of SHAPES) {
            for (const carat of CARAT_OPTIONS) {
              yield {
                metal: metal.id,
                band: band.id,
                setting: setting.id,
                shape: shape.id,
                carat,
                halo: null,
                sideStone,
              };
              for (const halo of getAvailableHaloTypes(shape.id)) {
                yield {
                  metal: metal.id,
                  band: band.id,
                  setting: setting.id,
                  shape: shape.id,
                  carat,
                  halo: halo.id,
                  sideStone,
                };
              }
            }
          }
        }
      }
    }
  }
}

export function getRingConfigurationId(configuration: RingConfiguration) {
  return [
    configuration.metal,
    configuration.band,
    configuration.setting,
    configuration.shape,
    configuration.carat,
    configuration.halo ?? "No Halo",
    configuration.sideStone ?? "No Side Stones",
  ].join("|");
}

export function resolveRingAssetFiles(configuration: RingConfiguration) {
  const band = BANDS.find((candidate) => candidate.id === configuration.band)?.file;
  const setting = SETTINGS.find((candidate) => candidate.id === configuration.setting)?.file;
  const shape = SHAPES.find((candidate) => candidate.id === configuration.shape)?.file;
  const sideStone = configuration.sideStone
    ? SIDE_STONES.find((candidate) => candidate.id === configuration.sideStone)?.file
    : null;
  const halo = getHaloFile(configuration.halo, configuration.shape);

  return [band, setting, shape, halo, sideStone].filter((file): file is string => Boolean(file));
}

export function getRingAssetCombinationId(configuration: RingConfiguration) {
  return resolveRingAssetFiles(configuration).join("|");
}

/**
 * This public claim gate is guarded by scripts/validate-ring-config.ts, which
 * exhaustively enumerates the catalog, checks every exact-case GLB path and
 * validates each GLB header before production builds.
 */
export const CONFIGURATION_VALIDATION = {
  total: 241_920,
  uniqueAssetCombinations: 4_320,
  claimEnabled: true,
} as const;
