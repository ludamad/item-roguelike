/**
 * Section: effects
 */
import * as Core from "../core/main";
import * as Umbra from "../umbra/main";
import * as Map from "../map/main";
import { Actor, SpecialActorsEnum } from "./actor";
import {
  TargetSelectionMethodEnum,
  ITargetSelectorDef,
  IConditionDef,
  InstantHealthEffectDef,
  EventEffectDef,
  ConditionEffectDef,
  InstantManaEffectDef,
  BlinkEffectDef,
} from "./actor_def";
import { transformMessage } from "./base";
import { Condition } from "./actor_condition";
import { DEFAULT_CONSOLE_HEIGHT } from "../umbra/main";
import { ActorFactory } from "./actor_factory";

export type EffectTarget = Core.Position | Actor;

/**
 * =============================================================================
 * Group: target selection
 * =============================================================================
 */
export interface ITilePicker {
  pickATile(
    message: string,
    origin?: Core.Position,
    minRange?: number,
    range?: number,
    radius?: number,
    autotargetEnemy?: boolean
  ): Promise<Core.Position | undefined>;
}

/**
 * Class: TargetSelector
 * Various ways to select actors
 */
export class TargetSelector {
  private _method: TargetSelectionMethodEnum;
  private actorType: string | undefined;
  private _range: number | undefined;
  private _radius: number | undefined;

  constructor(def: ITargetSelectorDef) {
    if (def) {
      this._method = def.method;
      this._range = def.range;
      this._radius = def.radius;
      this.actorType = def.actorType;
    }
  }

  /**
   * Property: method
   * The target selection method (read-only)
   */
  get method() {
    return this._method;
  }

  /**
   * Property: range
   * The selection range (read-only)
   */
  get range(): number {
    if (!this._range) {
      throw new Error("They have no range!");
    }
    return this._range;
  }

  /**
   * Property: radius
   * Radius of effect around the selected position
   */
  get radius() {
    if (!this._radius) {
      throw new Error("They have no radius!");
    }
    return this._radius;
  }

  /**
   * Function: selectTargets
   * Populates the __selectedTargets field, or triggers the tile picker
   * Parameters:
   * owner - the actor owning the effect (the magic item or the scroll)
   * wearer - the actor using the item
   * cellPos - the selected cell where the effect applies (for types SELECTED_ACTOR and SELECTED_RANGE)
   * Returns:
   * true if targets have been selected (else wait for TILE_SELECTED event, then call <onTileSelected>)
   */
  public async selectTargets(
    _owner: Actor,
    wearer: Actor,
    cellPos?: Core.Position
  ): Promise<EffectTarget[]> {
    switch (this._method) {
      // synchronous cases
      case TargetSelectionMethodEnum.WEARER:
        return [wearer];
      case TargetSelectionMethodEnum.ACTOR_ON_CELL:
        if (cellPos) {
          return Actor.list.filter(
            (actor: Actor) =>
              actor.pos.equals(cellPos) && actor.isA("creature[s]")
          );
        }
        break;
      case TargetSelectionMethodEnum.CLOSEST_ENEMY:
        let actor = Actor.findClosestEnemy(
          cellPos ? cellPos : wearer.pos,
          this.range
        );
        if (actor) {
          return [actor];
        }
        break;
      case TargetSelectionMethodEnum.ACTORS_IN_RANGE:
        return Actor.list.filter(
          (actor: Actor) =>
            actor.isA("creature[s]") &&
            Core.Position.taxiDistance(
              cellPos ? cellPos : wearer.pos,
              actor.pos
            ) < this.range
        );
      // asynchronous cases
      case TargetSelectionMethodEnum.WEARER_INVENTORY:
        // check if there's only one corresponding target
        if (!wearer.container) {
          break;
        }
        let selectedTargets = [];
        wearer.container.getContent(this.actorType, true, selectedTargets);
        if (selectedTargets.length === 1) {
          // auto-select item when there's only one corresponding.
          break;
        } else if (selectedTargets.length > 1) {
          // player must select an actor from his inventory.
          selectedTargets = [];
          if (wearer.ai && wearer.ai.inventoryItemPicker) {
            const item = await wearer.ai.inventoryItemPicker.pickItemFromInventory(
              "select an item",
              wearer,
              this.actorType
            );
            selectedTargets.push(item);
          }
        }
        break;
      case TargetSelectionMethodEnum.SELECTED_ACTOR:
        if (wearer.ai && wearer.ai.tilePicker) {
          const pos = await wearer.ai.tilePicker.pickATile(
            "Left-click a target creature,\nor right-click to cancel.",
            new Core.Position(wearer.pos.x, wearer.pos.y),
            0,
            this._range,
            this._radius
          );
          if (!pos) {
            return [];
          }
          return this.onTileSelected(pos);
        }
        break;
      case TargetSelectionMethodEnum.SELECTED_RANGE:
        if (wearer.ai && wearer.ai.tilePicker) {
          const pos = await wearer.ai.tilePicker.pickATile(
            "Left-click a target tile,\nor right-click to cancel.",
            new Core.Position(wearer.pos.x, wearer.pos.y),
            0,
            this._range,
            this._radius
          );
          if (!pos) {
            return [];
          }
          return this.onTileSelected(pos);
        }
        break;
      case TargetSelectionMethodEnum.SELECTED_EMPTY_TILE:
        if (wearer.ai && wearer.ai.tilePicker) {
          const pos = await wearer.ai.tilePicker.pickATile(
            "Left-click a target tile,\nor right-click to cancel.",
            new Core.Position(wearer.pos.x, wearer.pos.y),
            0,
            this._range,
            this._radius
          );
          if (!pos) {
            return [];
          }
          return this.onTileSelected(pos);
        }
        break;
      default:
        break;
    }
    return [];
  }

  /**
   * Function: onTileSelected
   * Populates the __selectedTargets field for selection methods that require a tile selection
   */
  public onTileSelected(pos: Core.Position): EffectTarget[] {
    switch (this._method) {
      case TargetSelectionMethodEnum.SELECTED_ACTOR:
        return Actor.list.filter(
          (actor: Actor) => actor.pos.equals(pos) && actor.isA("creature[s]")
        );
      case TargetSelectionMethodEnum.SELECTED_EMPTY_TILE:
        return [pos];
      case TargetSelectionMethodEnum.SELECTED_RANGE:
        return Actor.list.filter(
          (actor: Actor) =>
            actor.isA("creature[s]") &&
            Core.Position.taxiDistance(pos, actor.pos) < this.radius
        );
      default:
        break;
    }
    return [];
  }
}

/**
 * =============================================================================
 * Group: effects
 * =============================================================================
 */

export enum EffectResult {
  SUCCESS,
  FAILURE,
  SUCCESS_AND_STOP,
  FAILURE_AND_STOP,
}

/**
 * Interface: IEffect
 * Some effect that can be applied to actors. The effect might be triggered by using an item or casting a spell.
 */
export interface IEffect {
  /**
   * Function: applyTo
   * Apply an effect to an actor
   * Parameters:
   * actor - the actor this effect is applied to
   * bonus - a multiplicator to apply to the effect
   * Returns:
   * false if effect cannot be applied
   */
  applyTo(
    owner: Actor,
    actor: Actor,
    bonus: number
  ): EffectResult | Promise<EffectResult>;
}

export abstract class Effect implements IEffect {
  protected static booleanToEffectResult(
    result: boolean,
    singleActor: boolean
  ): EffectResult {
    if (result) {
      return singleActor ? EffectResult.SUCCESS_AND_STOP : EffectResult.SUCCESS;
    } else {
      return singleActor ? EffectResult.FAILURE_AND_STOP : EffectResult.FAILURE;
    }
  }

  public abstract applyTo(
    owner: Actor,
    actor: Actor,
    bonus: number
  ): EffectResult | Promise<EffectResult>;
}

/**
 * Class: InstantHealthEffect
 * Add or remove health points.
 */
export class InstantHealthEffect extends Effect {
  private _amount: number = 0;
  private canResurrect: boolean = false;
  private successMessage: string | undefined;
  private failureMessage: string | undefined;
  private _singleActor: boolean = false;

  get amount() {
    return this._amount;
  }
  get singleActor() {
    return this._singleActor;
  }

  constructor(def: InstantHealthEffectDef) {
    super();
    if (def) {
      this._amount = def.amount;
      this.successMessage = def.successMessage;
      this.failureMessage = def.failureMessage;
      if (def.canResurrect !== undefined) {
        this.canResurrect = def.canResurrect;
      }
      if (def.singleActor !== undefined) {
        this._singleActor = def.singleActor;
      }
    }
  }
  public applyTo(
    owner: Actor,
    actor: Actor,
    bonus: number = 1.0
  ): EffectResult {
    if (!actor.destructible) {
      return EffectResult.FAILURE;
    }
    if (this._amount > 0) {
      if (this.canResurrect || !actor.destructible.isDead()) {
        return this.applyHealingEffectTo(owner, actor, bonus);
      }
    }
    return this.applyWoundingEffectTo(owner, actor, bonus);
  }

  private applyHealingEffectTo(
    owner: Actor,
    actor: Actor,
    bonus: number = 1.0
  ): EffectResult {
    let healPointsCount: number = actor.destructible.heal(
      actor,
      bonus * this._amount
    );
    let wearer: Actor | undefined = actor.getWearer();
    let result: EffectResult = Effect.booleanToEffectResult(
      false,
      this._singleActor
    );
    if (healPointsCount > 0 && this.successMessage) {
      Umbra.logger.info(
        transformMessage(this.successMessage, actor, wearer, healPointsCount)
      );
      result = Effect.booleanToEffectResult(true, this._singleActor);
    } else if (healPointsCount <= 0 && this.failureMessage) {
      Umbra.logger.info(transformMessage(this.failureMessage, actor));
    }
    return result;
  }

  private applyWoundingEffectTo(
    owner: Actor,
    actor: Actor,
    damageBonus: number = 1.0
  ): EffectResult {
    if (actor.destructible.isDead()) {
      return EffectResult.FAILURE;
    }
    let wearer: Actor | undefined = actor.getWearer();
    let damageDealt = actor.destructible.computeDamage(
      actor,
      -this._amount + damageBonus
    );
    if (actor.destructible.hp <= damageDealt) {
      // TODO fix so player doesnt have to be hardcoded here
      const player = Actor.specialActors[SpecialActorsEnum.PLAYER];
      const mult = 0.66 ** (player.xpHolder.xpLevel - 1);
      const xpGain = Math.floor((actor.destructible.xp / 2) * mult);
      if (xpGain) {
        const msg =
          "[The actor2] [is2] dead. [The actor1] absorb[s] " +
          xpGain +
          " life.";
        Umbra.logger.warn(transformMessage(msg, player, actor));
        player.destructible.heal(player, xpGain);
        player.xpHolder.addXp(player, xpGain);
      }
    }
    if (damageDealt > 0 && this.successMessage) {
      Umbra.logger.info(
        transformMessage(this.successMessage, actor, wearer, damageDealt)
      );
    } else if (damageDealt <= 0 && this.failureMessage) {
      Umbra.logger.info(transformMessage(this.failureMessage, actor, wearer));
    }
    const result = Effect.booleanToEffectResult(
      actor.destructible.takeRawDamage(actor, damageDealt) || true,
      this._singleActor
    );
    return result;
  }
}

/**
 * Class: InstantHealthEffect
 * Add or remove mana points.
 */
export class InstantManaEffect extends Effect {
  private _amount: number = 0;

  get amount() {
    return this._amount;
  }

  constructor(def: InstantManaEffectDef) {
    super();
    if (def) {
      this._amount = def.amount;
    }
  }
  public applyTo(
    owner: Actor,
    actor: Actor,
    bonus: number = 1.0
  ): EffectResult {
    // TODO robustness
    const gain = Math.min(
      this.amount + bonus,
      actor.destructible.maxHp - actor.xpHolder.demonicFavorXp
    );
    if (!gain) {
      Umbra.logger.info(actor.getThename() + " has max mana!");
      return Effect.booleanToEffectResult(false, true);
    }
    Umbra.logger.info(actor.getThename() + " gain " + gain + " mana!");
    actor.xpHolder.demonicFavorXp += gain;
    return Effect.booleanToEffectResult(true, true);
  }
}
/**
 * Class: TeleportEffect
 * Teleport the target at a random location.
 */
export class TeleportEffect extends Effect {
  private successMessage: string | undefined;

  constructor(successMessage?: string) {
    super();
    this.successMessage = successMessage;
  }

  public applyTo(
    owner: Actor,
    actor: Actor,
    _bonus: number = 1.0
  ): EffectResult {
    let x: number;
    let y: number;
    [x, y] = Map.Map.current.findRandomWalkableCell();
    actor.moveTo(x, y);
    if (this.successMessage) {
      Umbra.logger.info(transformMessage(this.successMessage, actor));
    }
    return EffectResult.SUCCESS_AND_STOP;
  }
}

/**
 * Class: BlinkEffect
 * Blink to a target location.
 */
export class BlinkEffect extends Effect {
  constructor(def: BlinkEffectDef) {
    super();
  }

  public async applyTo(
    owner: Actor,
    actor: Actor,
    _bonus: number = 1.0
  ): Promise<EffectResult> {
    // For now, until AI targetting is needed
    const pos = await Actor.player.ai.tilePicker.pickATile(
      "Left-click a target tile,\nor right-click to cancel.",
      new Core.Position(owner.pos.x, owner.pos.y),
      0,
      9
    );
    console.log({ pos });
    if (!pos) {
      return EffectResult.FAILURE;
    }
    if (actor === Actor.player) {
      Umbra.logger.info(actor.getThename() + " blinks!");
    } else {
      Umbra.logger.info(actor.getThename() + " is forced to blink!");
    }
    actor.moveTo(pos.x, pos.y);
    return EffectResult.SUCCESS_AND_STOP;
  }
}

/**
 * Class: SummonEffect
 * Summon an ally.
 */
export class SummonEffect extends Effect {
  private actorType: string;
  private successMessage: string | undefined;

  constructor(actorType: string, successMessage?: string) {
    super();
    this.actorType = actorType;
    this.successMessage = successMessage;
  }

  public applyTo(
    owner: Actor,
    actor: Actor,
    _bonus: number = 1.0
  ): EffectResult {
    let x: number;
    let y: number;
    [x, y] = Map.Map.current.findRandomWalkableCell();
    // ActorFactory.create(actor.mapId);

    actor.moveTo(x, y);
    if (this.successMessage) {
      Umbra.logger.info(transformMessage(this.successMessage, actor));
    }
    return EffectResult.SUCCESS_AND_STOP;
  }
}

/**
 * class: EventEffect
 * Sends an event
 */
export class EventEffect extends Effect {
  private eventType: string;
  private eventData: any;
  constructor(def: EventEffectDef) {
    super();
    if (def) {
      this.eventType = def.eventType;
      this.eventData = def.eventData;
    }
  }

  public setEventData(fields: any) {
    this.eventData = { ...this.eventData, ...fields };
  }

  public applyTo(owner, _actor: Actor, _bonus: number = 1.0): EffectResult {
    Umbra.EventManager.publishEvent(this.eventType, this.eventData);
    return EffectResult.SUCCESS;
  }
}

/**
 * Class: ConditionEffect
 * Add a condition to an actor.
 */
export class ConditionEffect extends Effect {
  private conditionDef: IConditionDef;
  private message: string | undefined;
  private singleActor: boolean = false;
  constructor(def: ConditionEffectDef, message?: string) {
    super();
    this.message = message;
    if (def) {
      this.conditionDef = def.condition;
      this.singleActor = def.singleActor || false;
    }
  }

  public applyTo(owner, actor: Actor, _bonus: number = 1.0): EffectResult {
    if (!actor.ai) {
      return EffectResult.FAILURE;
    }
    actor.ai.addCondition(Condition.create(this.conditionDef), actor);
    if (this.message) {
      Umbra.logger.info(transformMessage(this.message, actor));
    }
    return Effect.booleanToEffectResult(true, this.singleActor);
  }
}

export class MapRevealEffect extends Effect {
  public applyTo(owner, actor: Actor, _bonus: number = 1.0): EffectResult {
    if (actor === Actor.specialActors[SpecialActorsEnum.PLAYER]) {
      Map.Map.current.reveal();
      return EffectResult.SUCCESS;
    }
    return EffectResult.FAILURE;
  }
}

/**
 * Class: Effector
 * Combines an effect and a target selector. Can also display a message before applying the effect.
 */
export class Effector {
  private _effect: IEffect;
  private targetSelector: TargetSelector;
  private message: string | undefined;
  private _bonus: number;
  private destroyOnEffect: boolean;

  get effect() {
    return this._effect;
  }
  get bonus() {
    return this._bonus;
  }
  constructor(
    _effect: IEffect,
    _targetSelector: TargetSelector,
    _message?: string,
    destroyOnEffect: boolean = false
  ) {
    this._effect = _effect;
    this.targetSelector = _targetSelector;
    this.message = _message;
    this.destroyOnEffect = destroyOnEffect;
  }

  /**
   * Function: apply
   * Select targets and apply the effect.
   * Returns:
   * false if a tile needs to be selected (in that case, wait for TILE_SELECTED event, then call <applyOnPos>)
   */
  public async apply(
    owner: Actor,
    wearer: Actor,
    cellPos?: Core.Position,
    bonus: number = 1.0
  ): Promise<boolean> {
    this._bonus = bonus;
    this.targetSelector;
    this._bonus = bonus;
    const targets = await this.targetSelector.selectTargets(
      owner,
      wearer,
      cellPos
    );
    const success = await this.applyEffectToActorList(
      owner,
      wearer,
      targets.filter((a) => (a as Actor).id) as Actor[]
    );
    return success && targets.length > 0;
  }

  private async applyEffectToActorList(
    owner: Actor,
    wearer: Actor,
    actors: Actor[]
  ): Promise<boolean> {
    let success: boolean = false;
    if (this.message) {
      Umbra.logger.info(transformMessage(this.message, wearer));
    }

    for (let actor of actors) {
      const result: EffectResult = await this._effect.applyTo(
        owner,
        actor,
        this._bonus
      );
      if (
        result === EffectResult.SUCCESS ||
        result === EffectResult.SUCCESS_AND_STOP
      ) {
        success = true;
      }
      if (
        result === EffectResult.SUCCESS_AND_STOP ||
        result === EffectResult.FAILURE_AND_STOP
      ) {
        break;
      }
    }
    if (this.destroyOnEffect && success && wearer && wearer.container) {
      owner.destroy();
    }
    return success;
  }
}
