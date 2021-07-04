import { nameByRace } from "fantasy-name-generator";
import { ACTOR_TYPES } from "./base";
import { CMWCRandom } from "./yendor/rng";

export interface StoryDetails {
  demonName: string;
  wizardName: string;
  dungeon: DungeonDetails;
}

export interface DungeonDetails {
  mapId: number;
  name: string;
  numPortalsIn: number;
  subBranches: DungeonDetails[];
  items?: string[];
  monsters?: string[];
}

function generateLinearDungeon(
  dungeonName: string,
  seedMapId: number,
  nLevels: number
): DungeonDetails {
  const result: DungeonDetails = {
    mapId: seedMapId,
    name: dungeonName + " 1",
    numPortalsIn: 1,
    subBranches: [],
  };
  for (let i = 1; i < nLevels; i++) {
    let seek = result;
    while (seek.subBranches.length > 0) {
      seek = seek.subBranches[0];
    }
    // Add next dungeon
    seek.subBranches.push({
      mapId: seedMapId + i,
      name: dungeonName + ` ${i + 1}`,
      numPortalsIn: 3,
      subBranches: [],
    });
  }
  return result;
}

export function generateStoryDetails() {
  let dungeon = generateLinearDungeon("Tartarus", 0, 5);
  for (let i = 0; i < 5; i++) {
    const branch = findBranch(dungeon, i);
    if (branch) {
      branch.items = [];
      if (i === 4) {
        branch.items = [ACTOR_TYPES.ARTEFACT];
      }
      const type = [
        ACTOR_TYPES.SHIELD,
        ACTOR_TYPES.ARMOUR,
        ACTOR_TYPES.BOOTS,
        ACTOR_TYPES.PANTS,
        ACTOR_TYPES.HELMET,
      ][CMWCRandom.default.getNumber(0, 4)];
      // for (const type of ) {
      let rng = CMWCRandom.default;
      if (rng.getNumber(0, 2) === 1) {
        continue;
      }
      if (i === 0) {
        branch.items.push(`wooden ${type}`);
      } else if (i === 1) {
        branch.items.push(`iron ${type}`);
      } else if (i === 2) {
        branch.items.push(`great${type}`);
      } else if (i === 3) {
        branch.items.push(`power${type}`);
      } else if (i === 4) {
        branch.items.push(`master${type}`);
      }
      // }
      // for (let j = 0; j < 15 + i * 5; j++) {
      //   branch.items.push(ACTOR_TYPES.POWER_BOLT);
      // }
    }
  }

  return {
    demonName: nameByRace("demon") as string,
    wizardName: nameByRace("elf", { gender: "female" }) as string,
    dungeon,
  };
}

export function findBranch(
  branch: DungeonDetails,
  mapId: number
): DungeonDetails | undefined {
  if (branch.mapId === mapId) {
    return branch;
  }
  let branchDetails: DungeonDetails | undefined = undefined;
  for (const subBranch of branch.subBranches || []) {
    branchDetails = branchDetails || findBranch(subBranch, mapId);
    if (branchDetails) {
      return branchDetails;
    }
  }
  return undefined;
}

export function branchItems(dungeon: DungeonDetails, mapId: number): string[] {
  const branch = findBranch(dungeon, mapId);
  if (branch) {
    return branch.items || [];
  }
  return [];
}

export function branchMonsters(
  dungeon: DungeonDetails,
  mapId: number
): string[] {
  const branch = findBranch(dungeon, mapId);
  if (branch) {
    return branch.monsters || [];
  }
  return [];
}
