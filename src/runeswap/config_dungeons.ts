import { BEHAVIOR_TREES } from "./config_actors";
import * as Actors from "./actors/main";
import * as Constants from "./base";
import { IBspDungeonConfig } from "./map/map_build_dungeon_bsp";
import { ACTOR_TYPES } from "./base";
import { getMonEntries } from "./getMonEntries";
// concat(
//   ...[
//     ACTOR_TYPES.HELMET,
//     ACTOR_TYPES.BOOTS,
//     ACTOR_TYPES.ARMOUR,
//     ACTOR_TYPES.PANTS,
//     ACTOR_TYPES.SHIELD,
//   ].map((proto) => [

function getArmourLoot(proto: string) {
  return [
    {
      clazz: `wooden ${proto}`,
      prob: [
        [0, 4],
        [4, 0],
      ],
    },
    { clazz: `iron ${proto}`, prob: [[1, 2]] },
    { clazz: `great${proto}`, prob: [[2, 1]] },
    { clazz: `power${proto}`, prob: [[3, 1]] },
  ];
}
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
    // {
    //   clazz: ACTOR_TYPES.SHORT_STAFF,
    //   prob: [
    //     [0, 4],
    //     [4, 0],
    //   ],
    // },
    // { clazz: ACTOR_TYPES.WAND_OF_FROST, prob: 1 },
    { clazz: ACTOR_TYPES.SCROLL_OF_TELEPORTATION, prob: 4 },
    { clazz: ACTOR_TYPES.SCROLL_OF_LIFE_DETECTION, prob: 4 },
    { clazz: ACTOR_TYPES.SCROLL_OF_CHARM_MONSTER, prob: 1 },
    // { clazz: ACTOR_TYPES.SCROLL_OF_MAPPING, prob: 1 },
    {
      clazz: ACTOR_TYPES.LONGSTAFF,
      prob: [
        [1, 2],
        [2, 0],
      ],
    },
    {
      clazz: ACTOR_TYPES.GREATSTAFF,
      prob: [
        [2, 1],
        [3, 0],
      ],
    },
    {
      clazz: ACTOR_TYPES.POWERSTAFF,
      prob: [
        [3, 1],
        [4, 2],
      ],
    },
    ...getArmourLoot(ACTOR_TYPES.HELMET),
    ...getArmourLoot(ACTOR_TYPES.BOOTS),
    ...getArmourLoot(ACTOR_TYPES.ARMOUR),
    ...getArmourLoot(ACTOR_TYPES.PANTS),
    ...getArmourLoot(ACTOR_TYPES.SHIELD),
  ],
  maxCount: 4,
  minCount: 1,
};

let itemProbabilities: Actors.IProbabilityMap = {
  classProb: [
    ...lootProbabilities.classProb,
    // { clazz: ACTOR_TYPES.POWER_BOLT, prob: 100 },
    // { clazz: ACTOR_TYPES.GOLD_PIECE, prob: 100 },
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
    {
      clazz: ACTOR_TYPES.MANA_POTION,
      prob: [
        [0, 20],
        [4, 15],
      ],
    },
    {
      clazz: ACTOR_TYPES.GREATER_MANA_POTION,
      prob: [[4, 15]],
    },
  ],
  countProb: {
    0: 2050,
    1: 400,
    2: 100,
  },
};

let creatureProbabilities: Actors.IProbabilityMap = {
  classProb: [
    ...getMonEntries(10, 15, 0, 1),
    ...getMonEntries(25, 35, 1, 2),
    ...getMonEntries(45, 55, 2, 3),
    ...getMonEntries(65, 75, 3, 4),
    ...getMonEntries(85, 95, 4, 5),
    ...getMonEntries(105, 115, 5, 6),
    // ...getMonEntries(80, 100, 6, 7),
    // ...getMonEntries(90, 120, 7, 8),
    // ...getMonEntries(100, 130, 8, 9),
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
