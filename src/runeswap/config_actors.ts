/**
 * Section: actors
 */
import * as Actors from "./actors/main";
import * as Yendor from "./yendor/main";
import * as Ai from "./ai/main";
import {
  GameStatus,
  BONE_COLOR,
  CANDLE_LIGHT_COLOR,
  DARK_WOOD_COLOR,
  EVENT_CHANGE_STATUS,
  GOLD_COLOR,
  HEALTH_POTION_COLOR,
  IRON_COLOR,
  NOLIGHT_COLOR,
  OIL_FLASK_COLOR,
  PAPER_COLOR,
  STEEL_COLOR,
  SUNROD_LIGHT_COLOR,
  TORCH_LIGHT_COLOR,
  WOOD_COLOR,
  XP_BASE_LEVEL,
  XP_NEW_LEVEL,
  SCENT_THRESHOLD,
  MIN_GUARD_RANGE,
  MAX_GUARD_RANGE,
  CTX_KEY_GUARD,
  ACTOR_TYPES,
  EVENT_USE_PORTAL,
} from "./base";
import { registerPersistentClasses } from "./config_persistent";
import {
  IConditionEffectDef,
  IEventEffectDef,
  IInstantHealthEffectDef,
  ITeleportEffectDef,
  PLAYER_WALK_TIME,
} from "./actors/main";
import { registerHostileDefs } from "./hostile";

// persistent classes must be registered before actors
// as behavior trees are created using the JSONSerializer
registerPersistentClasses();

export const BEHAVIOR_TREES = {
  BASIC_HOSTILE: "basic hostile",
  GUARD: "guard",
};

// ================================== behavior trees ==================================
// Attack on sight AI
Actors.ActorFactory.registerBehaviorTree(
  new Yendor.BehaviorTree(
    BEHAVIOR_TREES.BASIC_HOSTILE,
    new Yendor.SequenceNode([
      new Yendor.SelectorNode([
        // We do not allow diagonal movement in our game:
        new Ai.MoveToActionNode(Ai.CTX_KEY_PLAYER, /*min range*/ 0, false),
        new Ai.TrackScentActionNode(SCENT_THRESHOLD),
        new Yendor.InverterNode(new Ai.WaitActionNode()),
      ]),
      new Ai.AttackPlayerActionNode(/*no diagonals*/ false),
    ])
  )
);
// Guard treasure AI
Actors.ActorFactory.registerBehaviorTree(
  new Yendor.BehaviorTree(
    BEHAVIOR_TREES.GUARD,
    new Yendor.SelectorNode([
      new Ai.RangeCompareNode(
        CTX_KEY_GUARD,
        MAX_GUARD_RANGE,
        Yendor.NodeOperatorEnum.GREATER,
        new Ai.MoveToActionNode(CTX_KEY_GUARD, MIN_GUARD_RANGE, false)
      ),
      new Yendor.RunTreeNode(
        Actors.ActorFactory.getBehaviorTree(BEHAVIOR_TREES.BASIC_HOSTILE)
      ),
    ])
  )
);
// ================================== creatures ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.CREATURE,
  abstract: true,
  blockWalk: true,
  destructible: {
    corpseChar: "%",
    qualifiers: [
      "almost dead",
      "badly wounded",
      "wounded",
      "lightly wounded",
      "",
    ],
  },
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.HUMANOID,
  abstract: true,
  container: {
    capacity: 20,
    slots: [
      Actors.SLOT_LEFT_HAND,
      Actors.SLOT_RIGHT_HAND,
      Actors.SLOT_BOTH_HANDS,
    ],
  },
  prototypes: [ACTOR_TYPES.CREATURE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.HOSTILE_HUMANOID,
  abstract: true,
  ai: {
    type: Actors.AiTypeEnum.MONSTER,
    walkTime: PLAYER_WALK_TIME,
    // shorter syntax
    treeName: BEHAVIOR_TREES.BASIC_HOSTILE,
  },
  prototypes: [ACTOR_TYPES.HUMANOID],
});

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.GOBLIN,
//   ai: { type: Actors.AiTypeEnum.MONSTER, walkTime: PLAYER_WALK_TIME },
//   attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 1 },
//   ch: "g",
//   color: 0x3f7f3f,
//   destructible: {
//     corpseName: "goblin corpse",
//     defence: 0,
//     healthPoints: 3,
//     loot: {
//       classProb: [
//         { clazz: ACTOR_TYPES.GOLD_PIECE, prob: 1 },
//         { clazz: undefined, prob: 3 },
//       ],
//     },
//     xp: 10,
//   },
//   prototypes: [ACTOR_TYPES.HOSTILE_HUMANOID],
// });

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.ORC,
//   ai: { type: Actors.AiTypeEnum.MONSTER, walkTime: PLAYER_WALK_TIME },
//   attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 2 },
//   ch: "o",
//   color: 0x3f7f3f,
//   destructible: {
//     corpseName: "dead orc",
//     defence: 0,
//     healthPoints: 9,
//     loot: {
//       classProb: [
//         { clazz: ACTOR_TYPES.GOLD_PIECE, prob: 1 },
//         { clazz: ACTOR_TYPES.POTION, prob: 1 },
//       ],
//       countProb: { 0: 30, 1: 50, 2: 20 },
//     },
//     xp: 35,
//   },
//   prototypes: [ACTOR_TYPES.HOSTILE_HUMANOID],
// });

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.TROLL,
//   ai: { type: Actors.AiTypeEnum.MONSTER, walkTime: PLAYER_WALK_TIME },
//   attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 3 },
//   blockSight: true,
//   ch: "T",
//   color: 0x007f00,
//   destructible: {
//     corpseName: "troll carcass",
//     defence: 1,
//     healthPoints: 15,
//     loot: {
//       classProb: [
//         { clazz: ACTOR_TYPES.GOLD_PIECE, prob: 1 },
//         { clazz: ACTOR_TYPES.POTION, prob: 1 },
//       ],
//       countProb: { 0: 15, 1: 60, 2: 25 },
//     },
//     xp: 100,
//   },
//   prototypes: [ACTOR_TYPES.HOSTILE_HUMANOID],
// });

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.HUMAN,
  abstract: true,
  ch: "@",
  container: {
    capacity: 20,
    slots: [
      Actors.SLOT_LEFT_HAND,
      Actors.SLOT_RIGHT_HAND,
      Actors.SLOT_BOTH_HANDS,
      Actors.SLOT_QUIVER,
    ],
  },
  prototypes: [ACTOR_TYPES.HUMANOID],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.PLAYER,
  ai: { type: Actors.AiTypeEnum.PLAYER, walkTime: Actors.PLAYER_WALK_TIME },
  attacker: { attackTime: Actors.PLAYER_WALK_TIME, hitPoints: 2 },
  blockWalk: false,
  color: 0xffffff,
  destructible: {
    corpseName: "your cadaver",
    defence: 0,
    healthPoints: 25,
    xp: 0,
  },
  light: {
    color: 0xffffff,
    falloffType: Actors.LightFalloffTypeEnum.NORMAL,
    range: 8,
    renderMode: Actors.LightRenderModeEnum.ADDITIVE,
  },
  prototypes: [ACTOR_TYPES.HUMAN],
  xpHolder: { baseLevel: XP_BASE_LEVEL, newLevel: XP_NEW_LEVEL },
});
// ================================== items  ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.ITEM,
  abstract: true,
});
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.FLASK,
  abstract: true,
  ch: "!",
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.ITEM],
});
// ================================== money ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.MONEY,
  abstract: true,
  ch: "$",
  containerQualifier: true,
  pickable: { price: 1, weight: 0.05 },
  plural: true,
  prototypes: [ACTOR_TYPES.ITEM],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.GOLD_PIECE,
  color: GOLD_COLOR,
  plural: false,
  prototypes: [ACTOR_TYPES.MONEY],
});

// ================================== containers ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.CONTAINER,
  abstract: true,
  ch: "]",
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.STATIC_CONTAINER,
  abstract: true,
  color: DARK_WOOD_COLOR,
  prototypes: [ACTOR_TYPES.CONTAINER, ACTOR_TYPES.DEVICE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SMALL_CHEST,
  container: { capacity: 5 },
  prototypes: [ACTOR_TYPES.STATIC_CONTAINER],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.CHEST,
  container: { capacity: 15 },
  prototypes: [ACTOR_TYPES.STATIC_CONTAINER],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.CRATE,
  container: { capacity: 20 },
  prototypes: [ACTOR_TYPES.STATIC_CONTAINER],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.BARREL,
  container: { capacity: 30 },
  prototypes: [ACTOR_TYPES.STATIC_CONTAINER],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.PICKABLE_CONTAINER,
  abstract: true,
  color: WOOD_COLOR,
  pickable: { price: -1, weight: 0.2 },
  prototypes: [ACTOR_TYPES.CONTAINER, ACTOR_TYPES.ITEM],
});

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.POUCH,
//   container: { capacity: 2 },
//   prototypes: [ACTOR_TYPES.PICKABLE_CONTAINER],
// });
// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.BAG,
//   container: { capacity: 5 },
//   prototypes: [ACTOR_TYPES.PICKABLE_CONTAINER],
// });

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.SATCHEL,
//   container: { capacity: 10 },
//   prototypes: [ACTOR_TYPES.PICKABLE_CONTAINER],
// });

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.PACK,
//   container: { capacity: 40 },
//   prototypes: [ACTOR_TYPES.PICKABLE_CONTAINER],
// });

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.KEY_RING,
//   container: { capacity: 5, filter: [ACTOR_TYPES.KEY] },
//   prototypes: [ACTOR_TYPES.PICKABLE_CONTAINER],
// });

// Actors.ActorFactory.registerActorDef({
//   name: ACTOR_TYPES.MAP_CASE,
//   container: { capacity: 5, filter: [ACTOR_TYPES.SCROLL] },
//   prototypes: [ACTOR_TYPES.PICKABLE_CONTAINER],
// });

// ================================== potions ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.POTION,
  abstract: true,
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.FLASK],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.HEALTH_POTION,
  color: HEALTH_POTION_COLOR,
  pickable: {
    destroyedWhenThrown: true,
    onThrowEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: 3,
        failureMessage:
          "The potion explodes on [the actor1] but it has no effect",
        successMessage:
          "The potion explodes on [the actor1], healing [it] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_RANGE,
        radius: 1,
      },
    },
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: 20,
        failureMessage:
          "[The actor1] drink[s] the health potion but it has no effect",
        successMessage:
          "[The actor1] drink[s] the health potion and regain[s] [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: { method: Actors.TargetSelectionMethodEnum.WEARER },
    },
    price: 20,
    weight: 0.5,
  },
  prototypes: [ACTOR_TYPES.POTION],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.GREATER_HEALTH_POTION,
  color: HEALTH_POTION_COLOR,
  pickable: {
    destroyedWhenThrown: true,
    onThrowEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: 3,
        failureMessage:
          "The potion explodes on [the actor1] but it has no effect",
        successMessage:
          "The potion explodes on [the actor1], healing [it] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_RANGE,
        radius: 1,
      },
    },
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: 100,
        failureMessage:
          "[The actor1] drink[s] the health potion but it has no effect",
        successMessage:
          "[The actor1] drink[s] the health potion and regain[s] [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: { method: Actors.TargetSelectionMethodEnum.WEARER },
    },
    price: 20,
    weight: 0.5,
  },
  prototypes: [ACTOR_TYPES.POTION],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.REGENERATION_POTION,
  color: HEALTH_POTION_COLOR,
  pickable: {
    destroyedWhenThrown: true,
    onThrowEffector: {
      destroyOnEffect: true,
      effect: <IConditionEffectDef>{
        condition: {
          amount: 6,
          name: "regeneration",
          nbTurns: 12,
          type: Actors.ConditionTypeEnum.HEALTH_VARIATION,
        },
        successMessage:
          "The potion explodes on [the actor1].\nLife is flowing through [it].",
        type: Actors.EffectTypeEnum.CONDITION,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_RANGE,
        radius: 1,
      },
    },
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IConditionEffectDef>{
        condition: {
          amount: 10,
          name: "regeneration",
          nbTurns: 20,
          type: Actors.ConditionTypeEnum.HEALTH_VARIATION,
        },
        successMessage:
          "[The actor1] drink[s] the regeneration potion and feel[s]\n" +
          "the life flowing through [it].",
        type: Actors.EffectTypeEnum.CONDITION,
      },
      targetSelector: { method: Actors.TargetSelectionMethodEnum.WEARER },
    },
    price: 10,
    weight: 0.5,
  },
  prototypes: [ACTOR_TYPES.POTION],
});
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.ARTEFACT,
  ch: "%",
  color: STEEL_COLOR,
  containerQualifier: true,
  pickable: {
    price: -1,
    weight: 2,
  },
  prototypes: [ACTOR_TYPES.ITEM],
});
// ================================== scrolls ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL,
  abstract: true,
  ch: "#",
  color: PAPER_COLOR,
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.ITEM],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL_OF_LIGHTNING_BOLT,
  pickable: {
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: -20,
        successMessage:
          "A lightning bolt strikes [the actor1] with a loud thunder!\n" +
          "The damage is [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.CLOSEST_ENEMY,
        range: 5,
      },
    },
    price: 10,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.SCROLL],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL_OF_FIREBALL,
  pickable: {
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: -12,
        successMessage: "[The actor1] get[s] burned for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      message: "A fireball explodes, burning everything within 3 tiles.",
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_RANGE,
        radius: 3,
        range: 10,
      },
    },
    price: 10,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.SCROLL],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL_OF_CONFUSION,
  pickable: {
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IConditionEffectDef>{
        condition: {
          nbTurns: 12,
          type: Actors.ConditionTypeEnum.CONFUSED,
          noCorpse: true,
        },
        successMessage:
          "[The actor1's] eyes look vacant,\nas [it] start[s] to stumble around!",
        type: Actors.EffectTypeEnum.CONDITION,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_ACTOR,
        range: 5,
      },
    },
    price: 10,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.SCROLL],
});

// ================================== weapons ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.WEAPON,
  abstract: true,
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.ITEM],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.BLADE,
  abstract: true,
  ch: "/",
  color: STEEL_COLOR,
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.WEAPON],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.KNIFE,
  attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 3 },
  equipment: { slots: [Actors.SLOT_RIGHT_HAND] },
  pickable: {
    onThrowEffector: {
      destroyOnEffect: false,
      effect: <IInstantHealthEffectDef>{
        amount: -1,
        successMessage: "The sword hits [the actor1] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 1,
    weight: 0.5,
  },
  prototypes: [ACTOR_TYPES.BLADE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SHORT_SWORD,
  attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 4 },
  equipment: { slots: [Actors.SLOT_RIGHT_HAND] },
  pickable: {
    onThrowEffector: {
      destroyOnEffect: false,
      effect: <IInstantHealthEffectDef>{
        amount: -4,
        successMessage: "The sword hits [the actor1] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 5,
    weight: 2,
  },
  prototypes: [ACTOR_TYPES.BLADE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.LONGSWORD,
  attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 6 },
  equipment: { slots: [Actors.SLOT_RIGHT_HAND] },
  pickable: {
    onThrowEffector: {
      destroyOnEffect: false,
      effect: <IInstantHealthEffectDef>{
        amount: -6,
        successMessage: "The sword hits [the actor1] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 5,
    weight: 3,
  },
  prototypes: [ACTOR_TYPES.BLADE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.GREATSWORD,
  attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 9 },
  equipment: { slots: [Actors.SLOT_RIGHT_HAND] },
  pickable: {
    onThrowEffector: {
      destroyOnEffect: false,
      effect: <IInstantHealthEffectDef>{
        amount: -9,
        successMessage: "The sword hits [the actor1] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 15,
    weight: 4,
  },
  prototypes: [ACTOR_TYPES.BLADE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.POWERSWORD,
  attacker: { attackTime: PLAYER_WALK_TIME, hitPoints: 13 },
  equipment: { slots: [Actors.SLOT_RIGHT_HAND] },
  pickable: {
    onThrowEffector: {
      destroyOnEffect: false,
      effect: <IInstantHealthEffectDef>{
        amount: -13,
        successMessage: "The sword hits [the actor1] for [value1] hit points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 30,
    weight: 4,
  },
  prototypes: [ACTOR_TYPES.BLADE],
});
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SHIELD,
  abstract: true,
  ch: "[",
  containerQualifier: true,
  pickable: {
    onThrowEffector: {
      destroyOnEffect: false,
      effect: <IConditionEffectDef>{
        condition: {
          nbTurns: 2,
          type: Actors.ConditionTypeEnum.STUNNED,
          noCorpse: true,
        },
        successMessage: "The shield hits [the actor1] and stuns [it]!",
        type: Actors.EffectTypeEnum.CONDITION,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 5,
    weight: 5,
  },
  prototypes: [ACTOR_TYPES.WEAPON],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.WOODEN_SHIELD,
  color: WOOD_COLOR,
  equipment: {
    defence: 1,
    slots: [Actors.SLOT_LEFT_HAND],
  },
  prototypes: [ACTOR_TYPES.SHIELD],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.IRON_SHIELD,
  color: IRON_COLOR,
  equipment: {
    defence: 2,
    slots: [Actors.SLOT_LEFT_HAND],
  },
  prototypes: [ACTOR_TYPES.SHIELD],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.GREATSHIELD,
  color: IRON_COLOR,
  equipment: {
    defence: 3,
    slots: [Actors.SLOT_LEFT_HAND],
  },
  prototypes: [ACTOR_TYPES.SHIELD],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.POWERSHIELD,
  color: IRON_COLOR,
  equipment: {
    defence: 4,
    slots: [Actors.SLOT_LEFT_HAND],
  },
  prototypes: [ACTOR_TYPES.SHIELD],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.PROJECTILE,
  abstract: true,
  ch: "\\",
  containerQualifier: true,
  equipment: { slots: [Actors.SLOT_QUIVER] },
  prototypes: [ACTOR_TYPES.WEAPON],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.THROWN,
  abstract: true,
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.PROJECTILE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.TIME_DART,
  color: BONE_COLOR,
  ch: "\\",
  pickable: {
    onThrowEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: -2,
        successMessage:
          "The time dart instantly hits [the actor1] for [value1] damage.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
        singleActor: true,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 10,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.THROWN],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.ARROW,
  abstract: true,
  containerQualifier: true,
  prototypes: [ACTOR_TYPES.PROJECTILE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.IRON_ARROW,
  color: WOOD_COLOR,
  pickable: {
    onThrowEffector: {
      destroyOnEffect: true,
      effect: <IInstantHealthEffectDef>{
        amount: -2,
        successMessage: "The arrow hits [the actor1] for [value1] points.",
        type: Actors.EffectTypeEnum.INSTANT_HEALTH,
        singleActor: true,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.ACTOR_ON_CELL,
      },
    },
    price: 10,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.ARROW],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.RANGED,
  abstract: true,
  ch: ")",
  color: WOOD_COLOR,
  pickable: {
    price: 10,
    weight: 2,
  },
  prototypes: [ACTOR_TYPES.WEAPON],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SHORT_BOW,
  equipment: { slots: [Actors.SLOT_BOTH_HANDS] },
  prototypes: [ACTOR_TYPES.RANGED],
  ranged: {
    damageCoef: 4,
    loadTime: 4,
    projectileType: ACTOR_TYPES.ARROW,
    range: 15,
  },
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.LONG_BOW,
  equipment: { slots: [Actors.SLOT_BOTH_HANDS] },
  prototypes: [ACTOR_TYPES.RANGED],
  ranged: {
    damageCoef: 8,
    loadTime: 6,
    projectileType: ACTOR_TYPES.ARROW,
    range: 30,
  },
});

// ================================== staffs and wands ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.MAGIC,
  abstract: true,
});
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.WAND,
  abstract: true,
  ch: "/",
  color: WOOD_COLOR,
  containerQualifier: true,
  equipment: { slots: [Actors.SLOT_RIGHT_HAND] },
  pickable: {
    price: 10,
    weight: 0.5,
  },
  prototypes: [ACTOR_TYPES.WEAPON],
});
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.WAND_OF_FROST,
  magic: {
    charges: 5,
    onFireEffect: {
      destroyOnEffect: false,
      effect: <IConditionEffectDef>{
        condition: {
          nbTurns: 10,
          type: Actors.ConditionTypeEnum.FROZEN,
          noDisplay: true,
        },
        successMessage: "[The actor1] [is] covered with frost.",
        type: Actors.EffectTypeEnum.CONDITION,
      },
      message: "[The actor1] zap[s] [its] wand.",
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_ACTOR,
        range: 5,
      },
    },
  },
  prototypes: [ACTOR_TYPES.WAND],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.STAFF,
  abstract: true,
  ch: "/",
  color: WOOD_COLOR,
  containerQualifier: true,
  equipment: { slots: [Actors.SLOT_RIGHT_HAND, Actors.SLOT_LEFT_HAND] },
  pickable: {
    price: 10,
    weight: 3,
  },
  prototypes: [ACTOR_TYPES.WEAPON],
});
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL_OF_TELEPORTATION,
  pickable: {
    price: 10,
    weight: 0.1,
    onUseEffector: {
      destroyOnEffect: true,
      effect: <ITeleportEffectDef>{
        successMessage: "[The actor1] disappear[s] suddenly.",
        type: Actors.EffectTypeEnum.TELEPORT,
        singleActor: true,
      },
      message: "[The actor1] zap[s] [its] staff.",
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.SELECTED_ACTOR,
        range: 5,
      },
    },
  },
  prototypes: [ACTOR_TYPES.SCROLL],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL_OF_LIFE_DETECTION,
  pickable: {
    price: 10,
    weight: 0.1,
    onUseEffector: {
      destroyOnEffect: true,
      effect: <IConditionEffectDef>{
        condition: {
          nbTurns: 30,
          range: 15,
          type: Actors.ConditionTypeEnum.DETECT_LIFE,
        },
        successMessage: "[The actor1] [is] aware of life around [it].",
        type: Actors.EffectTypeEnum.CONDITION,
      },
      message: "[The actor1] zap[s] [its] staff.",
      targetSelector: { method: Actors.TargetSelectionMethodEnum.WEARER },
    },
  },
  prototypes: [ACTOR_TYPES.SCROLL],
});

// name: ACTOR_TYPES.SCROLL_OF_LIGHTNING_BOLT,
// pickable: {
//   onUseEffector: {
//     destroyOnEffect: true,
//     effect: <IInstantHealthEffectDef>{
//       amount: -20,
//       successMessage:
//         "A lightning bolt strikes [the actor1] with a loud thunder!\n" +
//         "The damage is [value1] hit points.",
//       type: Actors.EffectTypeEnum.INSTANT_HEALTH,
//     },
//     targetSelector: {
//       method: Actors.TargetSelectionMethodEnum.CLOSEST_ENEMY,
//       range: 5,
//     },
//   },
//   weight: 0.1,
// },
// prototypes: [ACTOR_TYPES.SCROLL],
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.SCROLL_OF_MAPPING,
  pickable: {
    onUseEffector: {
      destroyOnEffect: true,
      effect: {
        type: Actors.EffectTypeEnum.MAP_REVEAL,
      },
      message: "[The actor1] read[s] [its] scroll of mapping.",
      targetSelector: { method: Actors.TargetSelectionMethodEnum.WEARER },
    },
    price: 10,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.SCROLL],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.KEY,
  ch: "-",
  color: GOLD_COLOR,
  pickable: {
    price: -1,
    weight: 0.1,
  },
  prototypes: [ACTOR_TYPES.ITEM],
});

// ================================== dungeons devices ==================================
Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.DEVICE,
  abstract: true,
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.DOOR,
  abstract: true,
  blockWalk: true,
  ch: "+",
  displayOutOfFov: true,
  prototypes: [ACTOR_TYPES.DEVICE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.WOODEN_DOOR,
  activable: <Actors.IDoorDef>{
    activateMessage: "[The actor1] is open.",
    deactivateMessage: "[The actor1] is closed.",
    seeThrough: false,
    type: Actors.ActivableTypeEnum.DOOR,
  },
  blockSight: true,
  color: WOOD_COLOR,
  prototypes: [ACTOR_TYPES.DOOR],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.IRON_DOOR,
  activable: <Actors.IDoorDef>{
    activateMessage: "[The actor1] is open.",
    deactivateMessage: "[The actor1] is closed.",
    seeThrough: true,
    type: Actors.ActivableTypeEnum.DOOR,
  },
  blockSight: false,
  color: IRON_COLOR,
  prototypes: [ACTOR_TYPES.DOOR],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.STAIRS,
  abstract: true,
  color: 0xffffff,
  displayOutOfFov: true,
  plural: true,
  prototypes: [ACTOR_TYPES.DEVICE],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.STAIRS_UP,
  // activable: {
  //   activateMessage: "The stairs have collapsed. You can't go up anymore...",
  //   type: Actors.ActivableTypeEnum.SINGLE,
  // },
  activable: {
    onActivateEffector: {
      destroyOnEffect: false,
      effect: <IEventEffectDef>{
        eventData: {
          mapIdOffset: -1,
          portalType: ACTOR_TYPES.STAIRS_DOWN,
          portalVariant: 0,
        },
        eventType: EVENT_USE_PORTAL,
        type: Actors.EffectTypeEnum.EVENT,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.WEARER,
      },
    },
    type: Actors.ActivableTypeEnum.SINGLE,
  },
  ch: "<",
  prototypes: [ACTOR_TYPES.STAIRS],
});

Actors.ActorFactory.registerActorDef({
  name: ACTOR_TYPES.STAIRS_DOWN,
  activable: {
    onActivateEffector: {
      destroyOnEffect: false,
      effect: <IEventEffectDef>{
        eventData: {
          mapIdOffset: +1,
          portalType: ACTOR_TYPES.STAIRS_UP,
          portalVariant: 0,
        },
        eventType: EVENT_USE_PORTAL,
        type: Actors.EffectTypeEnum.EVENT,
      },
      targetSelector: {
        method: Actors.TargetSelectionMethodEnum.WEARER,
      },
    },
    type: Actors.ActivableTypeEnum.SINGLE,
  },
  ch: ">",
  prototypes: [ACTOR_TYPES.STAIRS],
});

registerHostileDefs();
