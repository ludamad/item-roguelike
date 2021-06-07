import { nameByRace } from "fantasy-name-generator";
import { ACTOR_TYPES } from "./base";

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
  let dungeon = generateLinearDungeon("Tartarus", 0, 9);
  for (let i = 8; i < 9; i++) {
    findBranch(dungeon, i).items = [ACTOR_TYPES.ARTEFACT];
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
