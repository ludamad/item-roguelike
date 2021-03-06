/**
 * Section: creatures
 */
import * as Core from "../core/main";
import * as Yendor from "../yendor/main";
import * as Umbra from "../umbra/main";
import * as Map from "../map/main";
import * as Ai from "../ai/main";
import { IActorFeature, ActorId } from "./actor_feature";
import {
  transformMessage,
  PlayerActionEnum,
  getLastPlayerAction,
  convertActionToPosition,
  PLAYER_WALK_TIME,
} from "./base";
import { Actor, SpecialActorsEnum } from "./actor";
import { ConditionTypeEnum, IXpHolderDef } from "./actor_def";
import { Condition } from "./actor_condition";
import { IContainerListener, Attacker, Container, Ranged } from "./actor_item";
import {
  SLOT_BOTH_HANDS,
  SLOT_LEFT_HAND,
  SLOT_RIGHT_HAND,
  OVERENCUMBERED_MULTIPLIER,
  FROZEN_MULTIPLIER,
  OVERENCUMBERED_THRESHOLD,
} from "./base";
import { ITilePicker } from "./actor_effect";
import { ActorFactory } from "./actor_factory";
import {
  adjacentPositionTowards,
  findAutopickupItem,
  findDoorNearUnexplored,
  findNearestEmpty,
  findNearestEnemy,
  findNearestStairsDown,
  findNearestStairsUp,
  findNearestUnexplored,
  isEmpty,
  pathTowards,
} from "../map_utils";
import { ACTOR_TYPES } from "../base";
import { getEngine } from "../main";

/**
 * ==============================================================================
 * Group: artificial intelligence
 * ==============================================================================
 */

/**
 * Class: BaseAi
 * Owned by self-updating actors
 */
export class BaseAi implements IActorFeature, IContainerListener {
  protected __context: Yendor.Context | undefined;
  private __behaviorTree: Yendor.BehaviorTree | undefined;

  public targetId?: ActorId;
  private behaviorTreeName: string;
  private _conditions: Condition[];
  // time to make a step
  private _walkTime: number;
  private __tilePicker: ITilePicker | undefined;
  private __inventoryItemPicker: IInventoryItemPicker | undefined;
  private __lootHandler: ILootHandler | undefined;

  public get context(): Yendor.Context {
    if (!this.__context) {
      // TODO this should be global
      this.__context = new Yendor.Context();
      this.__context.set(
        Ai.CTX_KEY_PLAYER,
        Actor.specialActors[SpecialActorsEnum.PLAYER]
      );
    }
    return this.__context;
  }
  public get behaviorTree(): Yendor.BehaviorTree | undefined {
    return this.__behaviorTree;
  }
  public set behaviorTree(tree: Yendor.BehaviorTree | undefined) {
    this.__behaviorTree = tree;
    if (tree) {
      this.behaviorTreeName = tree.name;
    }
  }

  constructor(
    walkTime: number,
    tilePicker?: ITilePicker,
    inventoryItemPicker?: IInventoryItemPicker,
    lootHandler?: ILootHandler
  ) {
    this._walkTime = walkTime;
    this.setPickers(tilePicker, inventoryItemPicker, lootHandler);
  }

  public postLoad() {
    if (this.behaviorTreeName !== undefined) {
      this.__behaviorTree = ActorFactory.getBehaviorTree(this.behaviorTreeName);
    }
  }

  /**
   * function: setPickers
   * Used to restore pickers references after loading from persistence
   */
  public setPickers(
    tilePicker?: ITilePicker,
    inventoryPicker?: IInventoryItemPicker,
    lootHandler?: ILootHandler
  ) {
    this.__tilePicker = tilePicker;
    this.__inventoryItemPicker = inventoryPicker;
    this.__lootHandler = lootHandler;
  }

  public getConditionTimeMultiplier() {
    let multiplier = 1.0;
    if (this.hasCondition(ConditionTypeEnum.OVERENCUMBERED)) {
      multiplier *= OVERENCUMBERED_MULTIPLIER;
    }
    if (this.hasCondition(ConditionTypeEnum.FROZEN)) {
      multiplier *= FROZEN_MULTIPLIER;
    }
    return multiplier;
  }

  get tilePicker(): ITilePicker | undefined {
    return this.__tilePicker;
  }

  get inventoryItemPicker(): IInventoryItemPicker | undefined {
    return this.__inventoryItemPicker;
  }

  get lootHandler(): ILootHandler | undefined {
    return this.__lootHandler;
  }

  get conditions(): Condition[] {
    return this._conditions;
  }

  get walkTime(): number {
    return this._walkTime;
  }
  set walkTime(newValue: number) {
    this._walkTime = newValue;
  }

  public async update(owner: Actor): Promise<void> {
    if (!this._conditions) {
      return;
    }
    for (let i: number = 0, n: number = this._conditions.length; i < n; ++i) {
      let cond: Condition = this._conditions[i];
      if (
        (!cond.onlyIfActive ||
          !owner.activable ||
          owner.activable.isActive()) &&
        !cond.update(owner)
      ) {
        cond.onRemove(owner);
        this._conditions.splice(i, 1);
        i--;
        n--;
      }
    }
  }

  public addCondition(cond: Condition, owner: Actor) {
    if (!this._conditions) {
      this._conditions = [];
    }
    this._conditions.push(cond);
    cond.onApply(owner);
  }

  public removeCondition(cond: ConditionTypeEnum) {
    if (!this._conditions) {
      return;
    }
    for (let i: number = 0, n: number = this._conditions.length; i < n; ++i) {
      if (this._conditions[i].type === cond) {
        this._conditions.splice(i, 1);
        break;
      }
    }
  }

  public getConditionDescription(owner: Actor): string | undefined {
    // find the first valid condition
    if (!this._conditions) {
      return undefined;
    }
    let i: number = 0;
    while (i < this._conditions.length) {
      let condition: Condition = this._conditions[i];
      if (condition.getName()) {
        if (
          !condition.noDisplay &&
          (!condition.noCorpse ||
            !owner.destructible ||
            !owner.destructible.isDead())
        ) {
          return condition.getName();
        }
      }
      i++;
    }
    return undefined;
  }

  public hasActiveConditions(): boolean {
    let n: number = this._conditions ? this._conditions.length : 0;
    for (let i: number = 0; i < n; i++) {
      if (this._conditions[i].time > 0) {
        return true;
      }
    }
    return false;
  }

  public getCondition(type: ConditionTypeEnum): Condition | undefined {
    let n: number = this._conditions ? this._conditions.length : 0;
    for (let i: number = 0; i < n; i++) {
      if (this._conditions[i].type === type) {
        return this._conditions[i];
      }
    }
    return undefined;
  }

  public hasCondition(type: ConditionTypeEnum): boolean {
    return this.getCondition(type) !== undefined;
  }

  // listen to inventory events to manage OVERENCUMBERED condition
  public onAdd(_actorId: ActorId, container: Container, owner: Actor) {
    // this.checkOverencumberedCondition(container, owner);
  }

  public onRemove(_actorId: ActorId, container: Container, owner: Actor) {
    // this.checkOverencumberedCondition(container, owner);
  }

  public moveToCell(owner: Actor, pos: Core.Position, attack: boolean) {
    let dx: number = pos.x - owner.pos.x;
    let dy: number = pos.y - owner.pos.y;
    // compute the move vector
    let stepdx: number = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    let stepdy: number = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    this.move(owner, stepdx, stepdy, attack);
  }

  /**
   * Function: move
   * Move to a destination cell, avoiding potential obstacles (walls, other creatures)
   * Parameters:
   * stepdx - horizontal direction
   * stepdy - vertical direction
   */
  public move(owner: Actor, stepdx: number, stepdy: number, attack: boolean) {
    let x: number = owner.pos.x;
    let y: number = owner.pos.y;
    let currentMap: Map.Map = owner.map;
    if (
      stepdx !== 0 &&
      (attack
        ? !currentMap.isWall(x + stepdx, y)
        : currentMap.canWalk(x + stepdx, y))
    ) {
      // horizontal slide
      x += stepdx;
    } else if (
      stepdy !== 0 &&
      (attack
        ? !currentMap.isWall(x, y + stepdy)
        : currentMap.canWalk(x, y + stepdy))
    ) {
      // vertical slide
      y += stepdy;
    }
    this.moveOrAttack(owner, x, y, attack);
  }

  /**
   * Function: tryActivate
   * Activate the first found lever in an adjacent tile
   */
  protected tryActivate(owner: Actor): boolean {
    // try on the creature's cell
    let actors: Actor[] = Actor.list.filter(
      (actor: Actor) =>
        ((actor.activable && !actor.pickable) ||
          (actor.container &&
            (!actor.pickable || actor.pickable.containerId === undefined))) &&
        actor.pos.equals(owner.pos) &&
        actor !== owner
    );
    if (actors.length > 0) {
      this.activateActors(owner, actors);
      return true;
    }
    return false;
  }

  /**
   * Function: moveOrAttack
   * Try to move the owner to a new map cell. If there's a living creature on this map cell, attack it.
   * Parameters:
   * x - the destination cell x coordinate
   * y - the destination cell y coordinate
   * Returns:
   * true if the owner actually moved to the new cell
   */
  protected moveOrAttack(
    owner: Actor,
    x: number,
    y: number,
    attack: boolean = true
  ): boolean {
    if (
      owner.isA(ACTOR_TYPES.PLAYER) &&
      owner.pos.x === x &&
      owner.pos.y === y
    ) {
      owner.scheduler.pause();
      return false;
    }
    if (this.hasCondition(ConditionTypeEnum.STUNNED)) {
      owner.wait(this._walkTime);
      return false;
    }
    if (this.hasCondition(ConditionTypeEnum.CONFUSED)) {
      // random move
      x = owner.pos.x + Yendor.CMWCRandom.default.getNumber(-1, 1);
      y = owner.pos.y + Yendor.CMWCRandom.default.getNumber(-1, 1);
    }
    if (x === owner.pos.x && y === owner.pos.y) {
      owner.wait(this._walkTime);
      return false;
    }
    // cannot move or attack a wall!
    if (owner.map.isWall(x, y)) {
      if (this.hasCondition(ConditionTypeEnum.CONFUSED)) {
        owner.wait(this._walkTime);
      } else if (owner.isA(ACTOR_TYPES.PLAYER)) {
        owner.scheduler.pause();
      } else {
        owner.wait(this._walkTime);
      }
      return false;
    }
    // check for living creatures on the destination cell
    let actors: Actor[] = owner.map.actorList.filter(
      (actor: Actor) =>
        actor.pos.x === x &&
        actor.pos.y === y &&
        actor.isA(ACTOR_TYPES.CREATURE) &&
        !actor.destructible.isDead()
    );
    if (actors.length > 0) {
      if (actors[0].teamId === owner.teamId) {
        // Don't attack teammate
        if (owner.isA(ACTOR_TYPES.PLAYER)) {
          owner.scheduler.pause();
        } else {
          owner.wait(this._walkTime);
        }
        return false;
      }
      if (attack) {
        // attack the first living actor found on the cell
        let attacker: Attacker = owner.getAttacker();
        attacker.attack(owner, actors[0]);
        owner.wait(attacker.attackTime);
        return false;
      } else {
        owner.wait(this._walkTime);
        return true;
      }
    }
    // check for a closed door
    actors = owner.map.actorList.filter(
      (actor: Actor) =>
        actor.pos.x === x &&
        actor.pos.y === y &&
        actor.isA("door[s]") &&
        !actor.activable.isActive()
    );
    if (actors.length > 0) {
      actors[0].activable.activate(actors[0], owner);
      owner.wait(this._walkTime);
      return false;
    }
    // check for unpassable items
    if (!owner.map.canWalk(x, y)) {
      owner.wait(this._walkTime);
      return false;
    }
    // move the creature
    owner.wait(this._walkTime);
    owner.moveTo(x, y);
    return true;
  }

  private activateActors(owner: Actor, actors: Actor[]) {
    let shouldWait = false;
    let containers: Actor[] = [];
    for (let actor of actors) {
      if (actor.activable) {
        actor.activable.switchLever(actor, owner);
        shouldWait = true;
      } else if (actor.container) {
        containers.push(actor);
      }
    }
    if (containers.length > 0 && this.lootHandler) {
      // this.lootHandler.lootContainer(owner, containers);
      for (const actor of containers) {
        const pos = actor.pos.clone();
        actor.moveTo(-1, -1);
        for (const item of actor.container.getContent(undefined)) {
          if (item instanceof Actor) {
            item.pickable.drop(item, owner, undefined, findNearestEmpty(pos));
          }
        }
        actor.destroy();
        shouldWait = true;
      }
    }
    if (shouldWait) {
      owner.wait(this._walkTime);
    } else {
      owner.scheduler.pause();
    }
  }

  private checkOverencumberedCondition(container: Container, owner: Actor) {
    if (
      !this.hasCondition(ConditionTypeEnum.OVERENCUMBERED) &&
      container.computeTotalWeight() >=
        container.capacity * OVERENCUMBERED_THRESHOLD
    ) {
      this.addCondition(
        Condition.create({
          nbTurns: -1,
          type: ConditionTypeEnum.OVERENCUMBERED,
          noCorpse: true,
        }),
        owner
      );
    } else if (
      this.hasCondition(ConditionTypeEnum.OVERENCUMBERED) &&
      container.computeTotalWeight() <
        container.capacity * OVERENCUMBERED_THRESHOLD
    ) {
      this.removeCondition(ConditionTypeEnum.OVERENCUMBERED);
    }
  }
}

export class ItemAi extends BaseAi {
  constructor(walkTime: number) {
    super(walkTime, undefined, undefined, undefined);
  }

  public async update(owner: Actor) {
    await super.update(owner);
    owner.wait(this.walkTime);
  }
}

export interface IInventoryItemPicker {
  pickItemFromInventory(
    title: string,
    wearer: Actor,
    itemClassFilter?: string
  ): Promise<Actor>;
}

export interface ILootHandler {
  lootContainer(actor: Actor, containers: Actor[] | Actor): void;
}

/**
 * Class: PlayerAi
 * Handles player input. Determin if a new game turn must be started.
 */
export class PlayerAi extends BaseAi {
  constructor(
    walkTime: number,
    tilePicker?: ITilePicker,
    inventoryPicker?: IInventoryItemPicker,
    lootHandler?: ILootHandler
  ) {
    super(walkTime, tilePicker, inventoryPicker, lootHandler);
  }

  /**
   * Function: update
   * Updates the player.
   */
  public async update(owner: Actor): Promise<void> {
    let action: PlayerActionEnum | undefined = getLastPlayerAction();
    if (action === undefined) {
      if (!owner.scheduler.isPaused()) {
        owner.scheduler.pause();
      }
      return;
    }
    // update conditions
    await super.update(owner);
    // conditions might have killed the actor
    if (
      this.hasCondition(ConditionTypeEnum.STUNNED) ||
      (owner.destructible && owner.destructible.isDead())
    ) {
      owner.wait(this.walkTime);
      return;
    }
    switch (action) {
      case PlayerActionEnum.AUTOFIGHT:
        // move to the target cell or attack if there's a creature
        this.autoFight(owner);
        break;
      case PlayerActionEnum.AUTODOWN:
        // move to the target cell or attack if there's a creature
        this.autoStairsDown(owner);
        break;
      case PlayerActionEnum.AUTOUP:
        // move to the target cell or attack if there's a creature
        this.autoStairsUp(owner);
        break;
      case PlayerActionEnum.AUTOEXPLORE:
        // move to the target cell or attack if there's a creature
        this.autoExplore(owner);
        break;
      case PlayerActionEnum.MOVE_NORTH:
      case PlayerActionEnum.MOVE_SOUTH:
      case PlayerActionEnum.MOVE_EAST:
      case PlayerActionEnum.MOVE_WEST:
        let move: Core.Position = convertActionToPosition(action);
        const x = owner.pos.x + move.x,
          y = owner.pos.y + move.y;
        if (
          Map.Map.current.canWalk(x, y) ||
          !isEmpty(new Core.Position(x, y))
        ) {
          // move to the target cell or attack if there's a creature
          this.moveOrAttack(owner, x, y);
        } else {
          owner.scheduler.pause();
        }
        break;
      case PlayerActionEnum.WAIT:
        owner.wait(this.walkTime);
        break;
      case PlayerActionEnum.GRAB:
      case PlayerActionEnum.SACRIFICE_ITEM:
      case PlayerActionEnum.USE_ITEM:
      case PlayerActionEnum.DROP_ITEM:
      case PlayerActionEnum.THROW_ITEM:
      case PlayerActionEnum.FIRE:
      case PlayerActionEnum.ZAP:
        // case PlayerActionEnum.ACTIVATE:
        if (!this.hasCondition(ConditionTypeEnum.CONFUSED)) {
          await this.handleAction(owner, action);
        }
        break;
      case PlayerActionEnum.MOVE_UP:
      case PlayerActionEnum.MOVE_DOWN:
      default:
        owner.scheduler.pause();
        // TODO. not supported. (flying mount or underwater swimming) or UI cancel in wrong time etc
        break;
    }
  }
  autoStairsDown(owner: Actor) {
    let pos = findNearestStairsDown(owner.pos);
    if (pos && pos.equals(owner.pos)) {
      return this.tryActivate(owner);
    }
    if (pos) {
      const nearest = adjacentPositionTowards(owner, pos);
      if (nearest) {
        // move to the target cell
        this.moveToCell(owner, nearest, true);
        return true;
      }
    }
    owner.scheduler.pause();
    return false;
  }
  autoStairsUp(owner: Actor) {
    let pos = findNearestStairsUp(owner.pos);
    if (pos && pos.equals(owner.pos)) {
      return this.tryActivate(owner);
    }
    if (pos) {
      const nearest = adjacentPositionTowards(owner, pos);
      if (nearest) {
        // move to the target cell
        this.moveToCell(owner, nearest, true);
        return true;
      }
    }
    owner.scheduler.pause();
    return false;
  }
  findEnemyAt(pos: Core.Position) {
    for (const actor of Map.Map.current.actorList) {
      if (
        actor.isA(ACTOR_TYPES.CREATURE) &&
        actor.teamId === 1 &&
        actor.pos.equals(pos)
      ) {
        return actor;
      }
    }
    return undefined;
  }
  autoExplore(owner: Actor) {
    const enemy = findNearestEnemy(owner.pos);
    if (enemy) {
      const enemyActor = this.findEnemyAt(enemy) as Actor;
      const damage = Actor.player.destructible.computeDamage(
        Actor.player,
        enemyActor.meleePower
      );
      const numToKill = Math.ceil(
        enemyActor.destructible.hp /
          enemyActor.destructible.computeDamage(
            enemyActor,
            Actor.player.meleePower
          )
      );
      const minThreat = damage * (numToKill - 1);
      const maxThreat = damage * numToKill;
      Umbra.logger.error(
        transformMessage("You cannot explore, you see [a actor1].", enemyActor)
      );
      if (minThreat <= 0) {
        Umbra.logger.error(
          transformMessage("Careful combat can avoid damage.", enemyActor)
        );
      } else {
        const mult = 0.66 ** (owner.xpHolder.xpLevel - 1);
        Umbra.logger.error(
          transformMessage(
            "Combat will cause " +
              minThreat +
              "+ damage and give " +
              Math.floor((enemyActor.destructible.xp / 2) * mult) +
              " XP.",
            enemyActor
          )
        );
      }
      owner.scheduler.pause();
      return;
    }
    let autopickupPos = findAutopickupItem(owner.pos);
    if (autopickupPos && autopickupPos.equals(owner.pos)) {
      if (this.pickupItem(owner)) {
        owner.wait(this.walkTime);
      } else {
        owner.scheduler.pause();
      }
      return;
    }
    const tryPath = (pos: Core.Position | undefined) => {
      if (pos) {
        const path = pathTowards(owner, pos);
        if (path) {
          return path;
        }
      }
      return undefined;
    };
    let targets = [
      tryPath(findNearestUnexplored(owner.pos)),
      tryPath(autopickupPos),
      tryPath(findDoorNearUnexplored(owner.pos)),
    ].filter((x) => x);
    targets.sort((a, b) => {
      // const dxA = owner.pos.x - a.x,
      //   dyA = owner.pos.y - a.y;
      // const dxB = owner.pos.x - b.x,
      //   dyB = owner.pos.y - b.y;
      if ((a || []).length < (b || []).length) {
        return -1;
      }
      if ((a || []).length > (b || []).length) {
        return +1;
      }
      return 0;
    });
    const tryTarget = (pos: Core.Position[] | undefined): boolean => {
      if (pos) {
        const nearest = pos.pop();
        if (nearest) {
          // move to the target cell
          this.moveToCell(owner, nearest, true);
          return true;
        }
      }
      return false;
    };
    const success =
      tryTarget(targets[0]) || tryTarget(targets[1]) || tryTarget(targets[2]);
    if (!success && targets.length === 0) {
      this.autoStairsDown(owner);
    } else if (!success) {
      owner.scheduler.pause();
    }
  }
  autoFight(owner: Actor) {
    const target = findNearestEnemy(owner.pos);
    if (target) {
      const dx = owner.pos.x - target.x,
        dy = owner.pos.y - target.y;
      if (Math.abs(dx) + Math.abs(dy) === 2) {
        // Wait if they are 2 away
        owner.wait(this.walkTime);
      } else {
        // move to the target cell
        this.moveToCell(owner, target, true);
      }
      //   if (nearest) {
      //     // move to the target cell
      //     this.moveOrAttack(owner, nearest.x, nearest.y);
      //   } else {
      //     owner.scheduler.pause();
      //   }
    } else {
      owner.scheduler.pause();
    }
  }

  /**
   * Function: moveOrAttack
   * Try to move the player to a new map call. if there's a living creature on this map cell, attack it.
   * Parameters:
   * owner - the actor owning this Attacker (the player)
   * x - the destination cell x coordinate
   * y - the destination cell y coordinate
   * Returns:
   * true if the player actually moved to the new cell
   */
  protected moveOrAttack(owner: Actor, x: number, y: number): boolean {
    if (!super.moveOrAttack(owner, x, y)) {
      return false;
    }
    let cellPos: Core.Position = new Core.Position(owner.pos.x, owner.pos.y);
    // no living actor. Log exising corpses and items
    Actor.describeCell(cellPos);
    return true;
  }

  private async handleAction(owner: Actor, action: PlayerActionEnum) {
    owner.scheduler.pause();
    switch (action) {
      case PlayerActionEnum.GRAB:
        if (this.pickupItem(owner)) {
          owner.wait(this.walkTime);
          owner.scheduler.resume();
        } else {
          owner.scheduler.pause();
        }
        break;
      case PlayerActionEnum.USE_ITEM:
        if (this.inventoryItemPicker) {
          const item = await this.inventoryItemPicker.pickItemFromInventory(
            "use an item",
            owner
          );
          if (!item) {
            owner.scheduler.pause();
            return;
          }
          const used = await this.useItem(owner, item);
          if (used) {
            owner.wait(this.walkTime);
            owner.scheduler.resume();
          } else {
            owner.scheduler.pause();
          }
        }
        break;
      case PlayerActionEnum.SACRIFICE_ITEM:
        if (this.inventoryItemPicker) {
          const item = await this.inventoryItemPicker.pickItemFromInventory(
            "sacrifice an item",
            owner
          );
          if (!item) {
            owner.scheduler.pause();
            return;
          }
          const used = await this.sacrificeItem(owner, item);
          if (used) {
            owner.wait(this.walkTime);
            owner.scheduler.resume();
          } else {
            owner.scheduler.pause();
          }
        }
        break;
      case PlayerActionEnum.DROP_ITEM:
        if (this.inventoryItemPicker) {
          const item = await this.inventoryItemPicker.pickItemFromInventory(
            "drop an item",
            owner
          );
          if (!item) {
            owner.scheduler.pause();
            return;
          }
          const used = await this.dropItem(owner, item);
          if (used) {
            owner.wait(this.walkTime);
            owner.scheduler.resume();
          } else {
            owner.scheduler.pause();
          }
        }
        break;
      case PlayerActionEnum.THROW_ITEM:
        if (this.inventoryItemPicker) {
          const item = await this.inventoryItemPicker.pickItemFromInventory(
            "throw an item",
            owner
          );
          if (!item) {
            owner.scheduler.pause();
            return;
          }
          const used = await this.throwItem(owner, item);
          if (used) {
            owner.wait(this.walkTime);
            owner.scheduler.resume();
          } else {
            owner.scheduler.pause();
          }
        }
        break;
      case PlayerActionEnum.FIRE:
        if (await this.fire(owner)) {
          owner.wait(this.walkTime);
          owner.scheduler.resume();
        } else {
          owner.scheduler.pause();
        }
        break;
      case PlayerActionEnum.ZAP:
        if (await this.zap(owner)) {
          owner.wait(this.walkTime);
          owner.scheduler.resume();
        }
        break;
      // case PlayerActionEnum.ACTIVATE:
      //   this.tryActivate(owner);
      //   break;
      default:
        break;
    }
  }

  /**
   * Function: fire
   * Fire a projectile using a ranged weapon.
   */
  private async fire(owner: Actor): Promise<boolean> {
    // load the weapon and starts the tile picker
    let weapon: Actor | undefined = owner.container.getFromSlot(
      SLOT_RIGHT_HAND
    );
    if (!weapon || !weapon.ranged) {
      weapon = owner.container.getFromSlot(SLOT_BOTH_HANDS);
    }
    if (!weapon || !weapon.ranged) {
      weapon = owner.container.getFromSlot(SLOT_LEFT_HAND);
    }
    if (!weapon || !weapon.ranged) {
      const synthetic = new Ranged({
        damageBonus: 0,
        projectileType: "spell[s]",
        loadTime: 0,
        range: 9,
        minRange: 2,
      });
      return await synthetic.fire(owner, weapon);
      // Umbra.logger.error("You have no ranged weapon equipped.");
      // owner.scheduler.pause();
      // return false;
    }
    return await weapon.ranged.fire(owner, weapon);
  }

  /**
   * Function: zap
   * Use a magic wand/staff/rod.
   */
  private async zap(owner: Actor): Promise<boolean> {
    let staff: Actor | undefined = owner.container.getFromSlot(SLOT_RIGHT_HAND);
    if (!staff || !staff.magic) {
      staff = owner.container.getFromSlot(SLOT_BOTH_HANDS);
    }
    if (!staff || !staff.magic) {
      staff = owner.container.getFromSlot(SLOT_LEFT_HAND);
    }
    if (!staff || !staff.magic) {
      Umbra.logger.error("You have no magic item equipped.");
      return false;
    }
    return await staff.magic.zap(staff, owner);
  }

  private async useItem(owner: Actor, item: Actor) {
    if (item.pickable) {
      const used = await item.pickable.use(item, owner);
      if (used || !owner.isA(ACTOR_TYPES.PLAYER)) {
        return true;
      }
    }
    return false;
  }
  private async sacrificeItem(owner: Actor, item: Actor) {
    if (item.pickable) {
      if (item.pickable.price > 0) {
        item.destroy();
        owner.xpHolder.addXp(owner, item.pickable.price);
        // owner.xpHolder.addDemonicFavor(owner, item.pickable.price);
        return true;
      } else {
        Umbra.logger.warn(
          transformMessage("You cannot sacrifice [the actor1].", item)
        );
      }
    }
    return false;
  }

  private dropItem(owner: Actor, item: Actor) {
    if (item.pickable) {
      const pos = findNearestEmpty(owner.pos);
      item.pickable.drop(item, owner, undefined, pos, undefined, true);
      return true;
    }
    return false;
  }

  private async throwItem(owner: Actor, item: Actor): Promise<boolean> {
    if (item.pickable) {
      await item.pickable.throw(
        item,
        Actor.specialActors[SpecialActorsEnum.PLAYER],
        false
      );
      return true;
    }
    return false;
  }

  private pickupItem(owner: Actor): boolean {
    let foundItem: boolean = false;
    let pickedItem: boolean = false;
    for (let item of Actor.list) {
      if (
        item.pickable &&
        item.pos.equals(owner.pos) &&
        item.pickable.containerId === undefined
      ) {
        foundItem = true;
        if (owner.container.canContain(item)) {
          item.pickable.pick(item, owner, true);
          pickedItem = true;
          break;
        }
      }
    }
    if (!foundItem) {
      if (!this.tryActivate(owner)) {
        Umbra.logger.warn("There's nothing to pick up here.");
        return false;
      }
      return true;
    } else if (!pickedItem) {
      Umbra.logger.warn("Your inventory is full.");
      return false;
    } else {
      return true;
    }
  }
}

/**
 * Class: MonsterAi
 * NPC monsters articial intelligence. Attacks the player when he is at melee range,
 * else moves towards him using scent tracking.
 */
export class MonsterAi extends BaseAi {
  constructor(walkTime: number, template: BaseAi | undefined) {
    // TODO AI tile picker and inventory item picker for intelligent creatures
    super(walkTime, undefined, undefined, undefined);
    if (template && template.behaviorTree) {
      this.behaviorTree = template.behaviorTree;
    }
  }

  public async update(owner: Actor) {
    await super.update(owner);

    // don't update a dead monster
    if (owner.destructible && owner.destructible.isDead()) {
      owner.wait(this.walkTime);
      return;
    }
    if (this.behaviorTree) {
      this.behaviorTree.tick(this.context, owner);
    } else {
      owner.wait(this.walkTime);
    }
  }
}

export class XpHolder implements IActorFeature {
  private _xpLevel: number = 1;
  private baseLevel: number;
  private newLevel: number;
  private _xp: number = 0;
  public demonicFavorXp: number = 10;
  public demonicFavorLevel: number = 1;

  constructor(def: IXpHolderDef) {
    if (def) {
      this.baseLevel = def.baseLevel;
      this.newLevel = def.newLevel;
    }
  }

  get xpLevel() {
    return this._xpLevel;
  }
  get xp() {
    return this._xp;
  }
  public getNextLevelXp(): number {
    return this.baseLevel + this._xpLevel * this.newLevel;
  }
  public getNextDemonicLevelXp(): number {
    return this.baseLevel + this._xpLevel * this.newLevel;
  }
  public addXp(owner: Actor, amount: number) {
    // TODO hackish
    this.addDemonicFavor(owner, amount);
    this._xp += amount;
    let nextLevelXp = this.getNextLevelXp();
    if (this._xp >= nextLevelXp) {
      this._xpLevel++;
      this._xp -= nextLevelXp;
      owner.destructible.gainMaxHP(10);
      this._xp += amount;
      this.addDemonicFavor(owner, 10);
      Umbra.logger.error(
        transformMessage(
          "[The actor1's] battle skills grow stronger!" +
            " [The actor1] reached level " +
            this.xpLevel,
          owner
        )
      );
      if (this.xpLevel === 2) {
        ActorFactory.createInContainer(Actor.player, [ACTOR_TYPES.BLINK]);
        Umbra.logger.error(
          transformMessage("[The actor1's] can now blink anyone away!", owner)
        );
      }
      if (this.xpLevel === 5) {
        ActorFactory.createInContainer(Actor.player, [
          ACTOR_TYPES.GREATER_BOLT,
        ]);
        Umbra.logger.error(
          transformMessage("[The actor1's] can now use powerful bolts!", owner)
        );
      }
      if (this.xpLevel === 4) {
        ActorFactory.createInContainer(Actor.player, [
          ACTOR_TYPES.CHARM_MONSTER,
        ]);
        Umbra.logger.error(
          transformMessage("[The actor1's] can now charm monsters!", owner)
        );
      }
    }
  }
  public addDemonicFavor(owner: Actor, amount: number) {
    this.demonicFavorXp = Math.min(
      owner.destructible.maxHp,
      amount + this.demonicFavorXp
    );

    // let nextLevelXp = this.getNextDemonicLevelXp();
    // if (this.demonicFavorXp >= nextLevelXp) {
    //   this.demonicFavorLevel++;
    //   this.demonicFavorXp -= nextLevelXp;
    //   Umbra.logger.error(
    //     transformMessage(
    //       `[The actor1's] is now favor level ${this.demonicFavorLevel} with ${
    //         getEngine().storyConfig.demonName
    //       }!`,
    //       owner
    //     )
    //   );
    // } else {
    //   Umbra.logger.error(
    //     transformMessage(
    //       `[The actor1] gain[s] favor with ${
    //         getEngine().storyConfig.demonName
    //       }!`,
    //       owner
    //     )
    //   );
    // }
  }
}
