import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONFIGURATION_VALIDATION,
  enumerateRingConfigurations,
  getAllowedSideStones,
  getRingAssetCombinationId,
  getRingConfigurationId,
  resolveRingAssetFiles,
} from "../src/lib/ring-config.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(projectRoot, "public");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function toPublicFile(assetUrl) {
  invariant(
    assetUrl.startsWith("/assets/") && !assetUrl.includes(".."),
    `Unsafe asset URL: ${assetUrl}`,
  );
  const file = resolve(publicRoot, assetUrl.slice(1));
  invariant(
    relative(publicRoot, file).split(sep)[0] !== "..",
    `Asset escaped public/: ${assetUrl}`,
  );
  return file;
}

async function assertExactCasePath(file) {
  const segments = relative(publicRoot, file).split(sep);
  let cursor = publicRoot;
  for (const segment of segments) {
    const entries = await readdir(cursor);
    invariant(
      entries.includes(segment),
      `Asset path has missing or case-mismatched segment: ${relative(projectRoot, file)}`,
    );
    cursor = join(cursor, segment);
  }
}

async function validateGlb(assetUrl) {
  const file = toPublicFile(assetUrl);
  await assertExactCasePath(file);
  const info = await stat(file);
  invariant(info.isFile(), `Mapped asset is not a file: ${assetUrl}`);

  const bytes = await readFile(file);
  invariant(bytes.length >= 20, `GLB is too short: ${assetUrl}`);
  invariant(bytes.toString("ascii", 0, 4) === "glTF", `Invalid GLB magic: ${assetUrl}`);
  invariant(bytes.readUInt32LE(4) === 2, `Unsupported GLB version: ${assetUrl}`);
  invariant(bytes.readUInt32LE(8) === bytes.length, `GLB declared length mismatch: ${assetUrl}`);

  const jsonLength = bytes.readUInt32LE(12);
  invariant(bytes.readUInt32LE(16) === 0x4e4f534a, `GLB first chunk is not JSON: ${assetUrl}`);
  invariant(20 + jsonLength <= bytes.length, `GLB JSON chunk exceeds file length: ${assetUrl}`);
  const json = JSON.parse(
    bytes
      .subarray(20, 20 + jsonLength)
      .toString("utf8")
      .replace(/[\u0000 ]+$/u, ""),
  );
  invariant(
    Array.isArray(json.meshes) && json.meshes.length > 0,
    `GLB contains no meshes: ${assetUrl}`,
  );
}

const configurationIds = new Set();
const assetCombinations = new Set();
const bandSideStates = new Set();
const referencedAssets = new Set();
let total = 0;

for (const configuration of enumerateRingConfigurations()) {
  total += 1;
  const id = getRingConfigurationId(configuration);
  invariant(!configurationIds.has(id), `Duplicate configuration ID: ${id}`);
  configurationIds.add(id);

  const allowedSideStones = getAllowedSideStones(configuration.band).map((stone) => stone.id);
  invariant(
    configuration.sideStone === null || allowedSideStones.includes(configuration.sideStone),
    `Invalid band/side-stone state: ${id}`,
  );

  const assets = resolveRingAssetFiles(configuration);
  const expectedAssetCount =
    3 + Number(configuration.halo !== null) + Number(configuration.sideStone !== null);
  invariant(assets.length === expectedAssetCount, `Configuration has an unresolved asset: ${id}`);
  for (const asset of assets) referencedAssets.add(asset);

  assetCombinations.add(getRingAssetCombinationId(configuration));
  bandSideStates.add(`${configuration.band}|${configuration.sideStone ?? "none"}`);
}

invariant(
  total === CONFIGURATION_VALIDATION.total,
  `Expected ${CONFIGURATION_VALIDATION.total} states, found ${total}`,
);
invariant(
  configurationIds.size === total,
  `Expected ${total} unique IDs, found ${configurationIds.size}`,
);
invariant(
  assetCombinations.size === CONFIGURATION_VALIDATION.uniqueAssetCombinations,
  `Expected ${CONFIGURATION_VALIDATION.uniqueAssetCombinations} asset combinations, found ${assetCombinations.size}`,
);
invariant(
  bandSideStates.size === 32,
  `Expected 32 band/side-stone states, found ${bandSideStates.size}`,
);
invariant(
  CONFIGURATION_VALIDATION.claimEnabled && total >= 240_000,
  "240,000+ claim gate is not satisfied",
);

await Promise.all([...referencedAssets].sort().map(validateGlb));

console.log(
  `Ring configuration validation passed: ${total.toLocaleString("en-US")} states, ` +
    `${assetCombinations.size.toLocaleString("en-US")} unique asset combinations, ` +
    `${referencedAssets.size} structurally valid GLBs.`,
);
