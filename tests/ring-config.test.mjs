import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIGURATION_VALIDATION,
  enumerateRingConfigurations,
  getAllowedSideStones,
  getHaloFile,
  getRingAssetCombinationId,
  getRingConfigurationId,
  repairSideStoneForBand,
  resolveRingAssetFiles,
} from "../src/lib/ring-config.ts";

test("enumerates every valid state with a stable unique ID", () => {
  const ids = new Set();
  let total = 0;

  for (const configuration of enumerateRingConfigurations()) {
    total += 1;
    const id = getRingConfigurationId(configuration);
    assert.equal(ids.has(id), false, `duplicate state: ${id}`);
    ids.add(id);

    const allowedSides = getAllowedSideStones(configuration.band).map((stone) => stone.id);
    assert.ok(configuration.sideStone === null || allowedSides.includes(configuration.sideStone));
    assert.equal(
      resolveRingAssetFiles(configuration).length,
      3 + Number(configuration.halo !== null) + Number(configuration.sideStone !== null),
      `unresolved assets: ${id}`,
    );
  }

  assert.equal(total, 241_920);
  assert.equal(ids.size, 241_920);
  assert.deepEqual(CONFIGURATION_VALIDATION, {
    total: 241_920,
    uniqueAssetCombinations: 4_320,
    claimEnabled: true,
  });
});

test("has 32 valid combined band and side-stone states", () => {
  const states = new Set();
  for (const configuration of enumerateRingConfigurations()) {
    states.add(`${configuration.band}|${configuration.sideStone ?? "none"}`);
  }
  assert.equal(states.size, 32);
});

test("resolves all 4,320 unique GLB combinations", () => {
  const combinations = new Set();
  for (const configuration of enumerateRingConfigurations()) {
    combinations.add(getRingAssetCombinationId(configuration));
  }
  assert.equal(combinations.size, 4_320);
});

test("maps Emerald non-Pavé halos to existing rectangular mounts", () => {
  assert.equal(getHaloFile("Hidden", "Emerald"), "/assets/halo/hidden/hidden-radiant.glb");
  assert.equal(getHaloFile("Ballerina", "Emerald"), "/assets/halo/ballerina/ballerina-radiant.glb");
  assert.equal(
    getHaloFile("Pave", "Emerald"),
    "/assets/halo/pave/pave-asscher_princess_cushion_radiant.glb",
  );
});

test("enforces petite and eternity side-stone compatibility", () => {
  assert.deepEqual(getAllowedSideStones("Diamond Eternity"), []);
  assert.deepEqual(getAllowedSideStones("Petite Eternity"), []);
  assert.deepEqual(
    getAllowedSideStones("Petite Cathedral").map((stone) => stone.id),
    ["Baguette", "Oval"],
  );
  assert.deepEqual(
    getAllowedSideStones("Petite 3-Sided").map((stone) => stone.id),
    ["Baguette", "Oval"],
  );
  assert.equal(repairSideStoneForBand("Petite Cathedral", "Pear"), null);
  assert.equal(repairSideStoneForBand("Petite 3-Sided", "Baguette"), "Baguette");
  assert.equal(repairSideStoneForBand("Diamond Eternity", "Oval"), null);
});
