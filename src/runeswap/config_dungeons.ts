import { BEHAVIOR_TREES } from "./config_actors";
import * as Actors from "./actors/main";
import * as Constants from "./base";
import { IBspDungeonConfig } from "./map/map_build_dungeon_bsp";
import { ACTOR_TYPES } from "./base";
import { IActorProbability } from "./actors/main";

let lootProbabilities: Actors.IProbabilityMap = {
  classProb: [
    // {
    //   clazz: ACTOR_TYPES.REGENERATION_POTION,
    //   prob: [
    //     [0, 20],
    //     [5, 15],
    //   ],
    // },
    { clazz: ACTOR_TYPES.SCROLL_OF_LIGHTNING_BOLT, prob: [[3, 10]] },
    { clazz: ACTOR_TYPES.SCROLL_OF_FIREBALL, prob: 16 },
    { clazz: ACTOR_TYPES.SCROLL_OF_CONFUSION, prob: 16 },
    // { clazz: ACTOR_TYPES.SHORT_BOW, prob: 1 },
    // { clazz: ACTOR_TYPES.LONG_BOW, prob: [[5, 1]] },
    {
      clazz: ACTOR_TYPES.SHORT_SWORD,
      prob: [
        [0, 4],
        [4, 0],
      ],
    },
    // { clazz: ACTOR_TYPES.WAND_OF_FROST, prob: 1 },
    { clazz: ACTOR_TYPES.STAFF_OF_TELEPORTATION, prob: 4 },
    { clazz: ACTOR_TYPES.STAFF_OF_LIFE_DETECTION, prob: 4 },
    // { clazz: ACTOR_TYPES.SCROLL_OF_MAPPING, prob: 1 },
    {
      clazz: ACTOR_TYPES.WOODEN_SHIELD,
      prob: [
        [0, 4],
        [4, 0],
      ],
    },
    { clazz: ACTOR_TYPES.LONGSWORD, prob: [[1, 2]] },
    { clazz: ACTOR_TYPES.IRON_SHIELD, prob: [[1, 2]] },
    { clazz: ACTOR_TYPES.GREATSWORD, prob: [[4, 1]] },
    { clazz: ACTOR_TYPES.GREATSHIELD, prob: [[4, 1]] },
  ],
  maxCount: 4,
  minCount: 1,
};

let itemProbabilities: Actors.IProbabilityMap = {
  classProb: [
    ...lootProbabilities.classProb,
    // { clazz: ACTOR_TYPES.IRON_ARROW, prob: 5 },
    { clazz: ACTOR_TYPES.GOLD_PIECE, prob: 100 },
    {
      clazz: ACTOR_TYPES.HEALTH_POTION,
      prob: [
        [0, 20],
        [4, 15],
      ],
    },
    {
      clazz: ACTOR_TYPES.GREATER_HEALTH_POTION,
      prob: [[4, 15]],
    },
  ],
  countProb: {
    0: 50,
    1: 40,
    2: 10,
  },
};

function getMonEntries(
  xpLow: number,
  xpHigh: number,
  levelLow: number,
  levelHigh: number
): IActorProbability[] {
  const entries: IActorProbability[] = [];
  for (const [clazz, v] of Object.entries(Actors.ActorFactory.actorDefs)) {
    if (
      v.destructible &&
      (v.destructible.xp ?? 0) >= xpLow &&
      (v.destructible.xp ?? 0) <= xpHigh
    ) {
      console.log(clazz, v.destructible.xp);
      entries.push({
        clazz,
        prob: [
          [levelLow, 30],
          [levelHigh, 5],
        ],
      });
    }
  }
  return entries;
}

let creatureProbabilities: Actors.IProbabilityMap = {
  classProb: [
    ...getMonEntries(0, 10, 0, 2),
    ...getMonEntries(10, 20, 1, 3),
    ...getMonEntries(20, 30, 2, 4),
    ...getMonEntries(40, 50, 3, 5),
    ...getMonEntries(50, 60, 4, 6),
    ...getMonEntries(70, 80, 5, 7),
    ...getMonEntries(80, 90, 6, 8),
    ...getMonEntries(90, 100, 7, 9),
    ...getMonEntries(100, 110, 8, 10),
    // { clazz: "hobgoblin[s]", prob: 30 },
    // { clazz: "jackal[s]", prob: 30 },
    // { clazz: "rat[s]", prob: 30 },
    // { clazz: "kobold[s]", prob: 30 },
    // {
    //   clazz: "orc[s]",
    //   prob: [
    //     [1, 30],
    //     [7, 80],
    //   ],
    // },
    // {
    //   clazz: "troll[s]",
    //   prob: [
    //     [3, 30],
    //     [5, 20],
    //     [7, 80],
    //   ],
    // },
  ],
  maxCount: 2,
};

let doorProbabilities: Actors.IProbabilityMap = {
  classProb: [
    { clazz: ACTOR_TYPES.WOODEN_DOOR, prob: 80 },
    // { clazz: ACTOR_TYPES.IRON_DOOR, prob: 20 },
  ],
};

let keyProbabilities: Actors.IProbabilityMap = {
  classProb: [{ clazz: ACTOR_TYPES.KEY, prob: 1 }],
};

export let dungeonConfig: IBspDungeonConfig = {
  creatureProbabilities: creatureProbabilities,
  doorProbabilities: doorProbabilities,
  itemProbabilities: itemProbabilities,
  keyProbabilities: keyProbabilities,
  lootContainerType: ACTOR_TYPES.STATIC_CONTAINER,
  lootProbabilities: lootProbabilities,
  maxTorches: 0, // No torches
  minTorches: 0,
  roomMinSize: Constants.ROOM_MIN_SIZE,
  wallLightProbabilities: { classProb: [] },
  guardAI: BEHAVIOR_TREES.GUARD,
};
