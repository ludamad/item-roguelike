import * as Actors from "./actors/main";
import { Destructible, PLAYER_WALK_TIME } from "./actors/main";
import { ACTOR_TYPES } from "./base";
import { HOSTILE_DESCS } from "./hostile_db";

export interface HostileDescriptor {
  name: string;
  attack: number;
  character: string;
  color: number;
  defence: number;
  healthPoints: number;
  experienceModifier: number;
}

// function calculateMonsterLevel(hostile: HostileDescriptor) {
//   for (let level = 1; level <= 5; level++) {
//     compu
//     new Destructible()
//     if (hostile.)
//   }
//   const playerPower;
// }

function calcXp(hostile: HostileDescriptor) {
  // return Math.ceil(
  //   (hostile.healthPoints ** 0.65 * hostile.experienceModifier) / 12
  // );
  // console.log("LVL", hostile.name, calculateMonsterLevel(hostile));
  return Math.ceil(
    (hostile.healthPoints ** 0.8 * hostile.attack) / 14
    // (hostile.attack * 5) ** 0.8
  );
}

function registerHostileDef(hostileDesc: HostileDescriptor) {
  let { name, attack, character, color, healthPoints } = hostileDesc;
  if (healthPoints <= 1) {
    return;
  }
  healthPoints += hostileDesc.defence * 5;
  const defence = 0; // simplification
  Actors.ActorFactory.registerActorDef({
    name: name + "[s]",
    ai: { type: Actors.AiTypeEnum.MONSTER, walkTime: PLAYER_WALK_TIME },
    attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: attack },
    ch: character,
    color,
    destructible: {
      defence,
      // corpseName: name + " corpse",
      // corpseChar: "%",
      healthPoints: Math.floor(healthPoints / 5),
      loot: {
        classProb: [
          { clazz: ACTOR_TYPES.GOLD_PIECE, prob: 1 },
          { clazz: undefined, prob: 3 },
        ],
      },
      xp: calcXp(hostileDesc),
    },
    prototypes: [ACTOR_TYPES.HOSTILE_HUMANOID],
  });
}

export function registerHostileDefs() {
  for (const hostile of HOSTILE_DESCS) {
    registerHostileDef(hostile);
  }
}
