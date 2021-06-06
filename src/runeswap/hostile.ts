import * as Actors from "./actors/main";
import { PLAYER_WALK_TIME } from "./actors/main";
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

function calcXp(hostile: HostileDescriptor) {
  return Math.ceil(
    (Math.sqrt(
      (hostile.healthPoints * Math.max(hostile.attack, hostile.defence)) / 4
    ) *
      hostile.experienceModifier) /
      12
  );
}

function registerHostileDef(hostileDesc: HostileDescriptor) {
  const { name, attack, character, color, defence, healthPoints } = hostileDesc;
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
