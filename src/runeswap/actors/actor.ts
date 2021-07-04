/**
 * Section: actors
 */
import * as Core from "../core/main";
import * as Yendor from "../yendor/main";
import * as Umbra from "../umbra/main";
import * as Map from "../map/main";
import { IActorDef, ConditionTypeEnum } from "./actor_def";
import { IActorFeature, ActorId, ActorFeatureTypeEnum } from "./actor_feature";
import { EVENT_LIGHT_ONOFF, SLOT_SPELL, PERSISTENCE_ACTORS_KEY } from "./base";
import {
  Destructible,
  Attacker,
  Activable,
  Container,
  Pickable,
  Equipment,
  Ranged,
  Magic,
  Lockable,
} from "./actor_item";
import { BaseAi, XpHolder } from "./actor_creature";
import { Light } from "./actor_light";
import { ActorFactory } from "./actor_factory";
import { TilingSprite } from "pixi.js";

/**
 * Probability for an actor class to spawn.
 * Can be used to configure dungeon creatures spawning or loot.
 * Use number matrix to give different probability for different
 * dungeon levels with format [[level1, prob1],[levelx, probx]].
 * Value is interpolated between level1 and levelx.
 * clazz can be undefined to define the probability to have no actor
 */
export interface IActorProbability {
  clazz: string | undefined;
  prob: number | number[][];
}

/**
 * randomizes both item count and classes.
 * count is either standard rng between minCount and maxCount,
 * or from the countProb probability map if you want
 * to fine tune the probability for a count value to be used.
 */
export interface IProbabilityMap {
  countProb?: { [index: number]: number };
  minCount?: number;
  maxCount?: number;
  classProb: IActorProbability[];
}

/**
 * ================================================================================
 * Group: actors
 * ================================================================================
 */
export enum SpecialActorsEnum {
  PLAYER = 1,
}

function remove<T>(array: T[], value: T) {
  // You can use the indexOf method like this:

  const index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

/**
 * Class: Actor
 * The base class for all actors.
 * Actor shouldn't hold references to other Actors, else there might be cyclic dependencies which
 * keep the json serializer from working. Instead, hold ActorId and use ActorManager.getActor()
 */
export class Actor extends Yendor.TimedEntity implements Yendor.IPersistent {
  /** fast way to retrieve some special actors like the player. SpecialActor => Actor */
  public static specialActors: { [index: string]: Actor } = {};
  // TODO do we need multiple schedulers?
  public static scheduler: Yendor.Scheduler = new Yendor.Scheduler();
  public static lootRng: Yendor.Random = new Yendor.CMWCRandom();
  public static idMap: { [index: number]: Actor } = {};

  public static fromId(id: ActorId | undefined): Actor | undefined {
    if (id === undefined) {
      return undefined;
    }
    return Actor.idMap[id];
  }
  public get map(): Map.Map {
    return Map.Map.mapDb[this.mapId];
  }
  public static get player(): Actor {
    return Actor.specialActors[SpecialActorsEnum.PLAYER];
  }

  public static get list(): Actor[] {
    return Map.Map.currentActors;
  }
  public static getScheduler(mapId: number): Yendor.Scheduler {
    // while (Actor.schedulers.length <= mapId) {
    //   Actor.schedulers.push(new Yendor.Scheduler());
    // }
    // return Actor.schedulers[mapId];
    return this.scheduler;
  }
  public static get currentScheduler(): Yendor.Scheduler {
    // return this.getScheduler(Map.Map.currentIndex);
    return Actor.scheduler;
  }
  public static resetCurrentScheduler() {
    Actor.scheduler = new Yendor.Scheduler();
  }

  public get scheduler(): Yendor.Scheduler {
    // return Actor.getScheduler(this.mapId);
    return Actor.scheduler;
  }

  public changeMap(newMapId: number) {
    remove(Map.Map.getActors(this.mapId), this);
    Map.Map.getActors(newMapId).push(this);
    this.mapId = newMapId;
    return Map.Map.getActors(this.mapId);
  }
  /**
   * Function: findClosestActor
   * In the `actors` array, find the closest creature (except the player) from position `pos` within `range`.
   * If range is 0, no range limitation.
   */
  public static findClosestEnemy(
    pos: Core.Position,
    range: number | undefined
  ): Actor | undefined {
    let bestDistance: number = 1e8;
    let closestActor: Actor | undefined;
    for (let actor of Actor.list) {
      if (
        actor !== Actor.specialActors[SpecialActorsEnum.PLAYER] &&
        actor.isA("creature[s]") &&
        !actor.destructible.isDead()
      ) {
        let distance: number = Core.Position.taxiDistance(pos, actor.pos);
        if (
          distance < bestDistance &&
          (range === undefined || distance < range || range === 0)
        ) {
          bestDistance = distance;
          closestActor = actor;
        }
      }
    }
    return closestActor;
  }

  public static load(persister: Yendor.IPersister): Promise<void> {
    return new Promise<void>((resolve) => {
      persister.loadFromKey(PERSISTENCE_ACTORS_KEY).then((_value) => {
        Map.Map.actorsDb = _value;
        let floor = 0;
        for (let actors of Map.Map.actorsDb) {
          floor++;
          for (let actor of actors) {
            let specialActor: SpecialActorsEnum | undefined;
            if (actor.isA("player")) {
              specialActor = SpecialActorsEnum.PLAYER;
            }
            if (specialActor !== undefined) {
              Actor.specialActors[specialActor] = actor;
            }
          }
        }
        resolve();
      });
    });
  }

  public static deleteSavedGame(persister: Yendor.IPersister) {
    persister.deleteKey(PERSISTENCE_ACTORS_KEY);
  }

  public static describeCell(pos: Core.Position, withPlayer: boolean = false) {
    for (let actor of Actor.list.filter(
      (actor: Actor) =>
        actor.pos.x === pos.x &&
        actor.pos.y === pos.y &&
        (withPlayer ||
          actor !== Actor.specialActors[SpecialActorsEnum.PLAYER]) &&
        (!actor.pickable || actor.pickable.containerId === undefined)
    )) {
      Umbra.logger.info(actor.getTheresaname() + " here.");
    }
  }

  /** the name to be used by mouse look or the inventory screen */
  public type: string;
  public name: string;
  public pluralName: string;
  public mapId: number;
  public teamId: number = 1;
  /** the color associated with this actor's symbol */
  public col: Core.Color;
  /** whether you can walk on the tile where this actor is */
  public blocks: boolean = false;
  /** whether light goes through this actor */
  public transparent: boolean = true;
  /** whether you can see this actor only if it's in your field of view */
  public fovOnly: boolean = true;
  /** whether this actor should be placed on a floor or wall tile */
  public wallActor: boolean = false;

  private _pos: Core.Position;
  private classes: string[] = [];
  private _id: ActorId;
  private _readableId: string;
  /** the ascii code of the symbol representing this actor on the map */
  private _ch: number;
  private features: { [index: number]: IActorFeature } = {};
  /** whether this actor name is singular (you can write "a <name>") */
  private _singular: boolean = true;

  get id() {
    return this._id;
  }
  get readableId() {
    return this._readableId;
  }

  constructor(mapId?: number, readableId?: string) {
    super();
    if (mapId === undefined || readableId === undefined) {
      // We are loading a game - bail out and let the JSON fields
      // get copied over
      // TODO cleaner constructor
      return;
    }
    this.mapId = mapId;
    this._pos = new Core.Position();
    this._readableId = readableId;
    this._id = Core.crc32(this._readableId);
    Actor.idMap[this._id] = this;
    if (Umbra.logger.isDebugEnabled()) {
      Umbra.logger.debug(
        "new actor " + this.readableId + "[" + this._id.toString(16) + "]"
      );
    }
    Map.Map.getActors(mapId).push(this);
  }

  /** register this actor in the scheduler */
  public register() {
    // TODO clean this mess!
    if (this.ai) {
      Actor.getScheduler(this.mapId).add(this);
    }
    if (this.light && (!this.activable || this.activable.isActive())) {
      Umbra.EventManager.publishEvent(EVENT_LIGHT_ONOFF, this);
    }
    // possibly set the map transparency
    this.moveTo(this.pos.x, this.pos.y);
  }

  /**
   * Function: postLoad
   * json.stringify cannot handle cyclic dependencies so we have to rebuild them here.
   * Also, when loading from persistence, constructor is called without parameters
   */
  public postLoad() {
    Actor.idMap[this._id] = this;
    // if (this.ai) {
    //   Actor.getScheduler(this.mapId).rawAdd(this);
    // }
    if (this.light && (!this.activable || this.activable.isActive())) {
      Umbra.EventManager.publishEvent(EVENT_LIGHT_ONOFF, this);
    }
    // possibly set the map transparency
    this.moveTo(this.pos.x, this.pos.y);
    // rebuild container -> listener backlinks
    if (this.ai && this.container) {
      this.container.setListener(this.ai);
    }
  }

  /**
   * Function: getAttacker
   * Determin what will be used to attack
   */
  public getAttacker(): Attacker {
    if (this.container) {
      // check for equipped weapons
      // TODO each equipped weapon should be used only once per turn
      for (let i: number = 0, n: number = this.container.size(); i < n; ++i) {
        let item: Actor | undefined = this.container.get(i);
        if (
          item &&
          item.equipment &&
          item.equipment.isEquipped() &&
          item.attacker
        ) {
          return item.attacker;
        }
      }
    }
    return this.attacker;
  }

  public destroy() {
    let wearer: Actor | undefined = this.getWearer();
    if (wearer) {
      wearer.container.remove(this.id, wearer);
    }
    if (this.ai) {
      Actor.getScheduler(this.mapId).remove(this);
    }
    if (this.activable && this.activable.isActive() && this.light) {
      this.activable.deactivate(this);
    }
    if (this.container) {
      let i: number = this.container.size();
      while (i > 0) {
        let actor: Actor | undefined = this.container.get(0);
        if (actor) {
          actor.destroy();
        }
        --i;
      }
    }
    delete Actor.idMap[this._id];
    let index = Actor.list.indexOf(this);
    if (index !== -1) {
      Actor.list.splice(index, 1);
    }
  }

  public equals(c: Actor): boolean {
    return this._id === c._id;
  }

  public init(def: IActorDef) {
    if (!def) {
      return;
    }
    if (def.ch) {
      this._ch = def.ch.charCodeAt(0);
    }
    if (def.name) {
      this.type = def.name;
    }
    if (def.color !== undefined) {
      this.col = def.color;
    }
    if (def.plural !== undefined) {
      this._singular = !def.plural;
    }
    if (def.blockWalk !== undefined) {
      this.blocks = def.blockWalk;
    }
    if (def.blockSight !== undefined) {
      this.transparent = !def.blockSight;
    }
    if (def.wallActor) {
      this.wallActor = def.wallActor;
    }
    if (def.displayOutOfFov !== undefined) {
      this.fovOnly = !def.displayOutOfFov;
    }
    if (def.prototypes) {
      for (let type of def.prototypes) {
        this.classes.push(type);
      }
    }
  }

  get pos(): Core.Position {
    return this._pos;
  }
  public moveTo(x: number, y: number) {
    if (!this.transparent) {
      this.map.setTransparent(this.pos.x, this.pos.y, true);
      this._pos.moveTo(x, y);
      this.map.setTransparent(this.pos.x, this.pos.y, false);
    } else {
      this._pos.moveTo(x, y);
    }
    if (this.container) {
      // move items in inventory (needed for lights)
      for (
        let i: number = 0, len: number = this.container.size();
        i < len;
        ++i
      ) {
        let actor: Actor | undefined = this.container.get(i);
        if (actor) {
          actor.moveTo(x, y);
        }
      }
    }
  }

  public computeThrowRange(_thrower: Actor): number {
    let weight: number = this.pickable.weight;
    let maxRange: number = weight < 0.5 ? 3 : 15 / weight;
    if (this.equipment && this.equipment.canUseSlot(SLOT_SPELL)) {
      // increase projectile throw range
      maxRange *= 2.5;
    }
    // TODO should also depend on thrower's force
    return maxRange;
  }

  public isA(type: string): boolean {
    return this.type === type || this.classes.indexOf(type) !== -1;
  }

  public getClasses(): string[] {
    return this.classes;
  }

  public isPlayer() {
    return this === Actor.specialActors[SpecialActorsEnum.PLAYER];
  }

  get ch() {
    return String.fromCharCode(this._ch);
  }
  get charCode() {
    return this._ch;
  }
  set ch(newValue: string) {
    this._ch = newValue.charCodeAt(0);
  }

  public isSingular(): boolean {
    return this._singular;
  }

  // For special circumstances, transforming stairs etc
  public setSingular(value: boolean) {
    this._singular = value;
  }

  public isStackable(): boolean {
    return (
      !this.destructible &&
      (!this.equipment ||
        !this.equipment.isEquipped() ||
        this.equipment.canUseSlot(SLOT_SPELL))
    );
  }

  // feature getters & setters
  public hasFeature(featureType: ActorFeatureTypeEnum): boolean {
    return this.features[featureType] !== undefined;
  }

  /**
   * Function: getWearer
   * Return the actor wearing (containing) this actor
   */
  public getWearer(): Actor | undefined {
    if (this.pickable && this.pickable.containerId) {
      return Actor.idMap[this.pickable.containerId];
    }
    return undefined;
  }

  get destructible(): Destructible {
    return <Destructible>this.features[ActorFeatureTypeEnum.DESTRUCTIBLE];
  }
  set destructible(newValue: Destructible) {
    this.features[ActorFeatureTypeEnum.DESTRUCTIBLE] = newValue;
  }

  get attacker(): Attacker {
    return <Attacker>this.features[ActorFeatureTypeEnum.ATTACKER];
  }
  set attacker(newValue: Attacker) {
    this.features[ActorFeatureTypeEnum.ATTACKER] = newValue;
  }

  get ai(): BaseAi {
    return <BaseAi>this.features[ActorFeatureTypeEnum.AI];
  }
  set ai(newValue: BaseAi) {
    this.features[ActorFeatureTypeEnum.AI] = newValue;
  }

  get pickable(): Pickable {
    return <Pickable>this.features[ActorFeatureTypeEnum.PICKABLE];
  }
  set pickable(newValue: Pickable) {
    this.features[ActorFeatureTypeEnum.PICKABLE] = newValue;
  }

  get container(): Container {
    return <Container>this.features[ActorFeatureTypeEnum.CONTAINER];
  }
  set container(newValue: Container) {
    this.features[ActorFeatureTypeEnum.CONTAINER] = newValue;
  }

  get equipment(): Equipment {
    return <Equipment>this.features[ActorFeatureTypeEnum.EQUIPMENT];
  }
  set equipment(newValue: Equipment) {
    this.features[ActorFeatureTypeEnum.EQUIPMENT] = newValue;
  }

  get ranged(): Ranged {
    return <Ranged>this.features[ActorFeatureTypeEnum.RANGED];
  }
  set ranged(newValue: Ranged) {
    this.features[ActorFeatureTypeEnum.RANGED] = newValue;
  }

  get magic(): Magic {
    return <Magic>this.features[ActorFeatureTypeEnum.MAGIC];
  }
  set magic(newValue: Magic) {
    this.features[ActorFeatureTypeEnum.MAGIC] = newValue;
  }

  get activable(): Activable {
    return <Activable>this.features[ActorFeatureTypeEnum.ACTIVABLE];
  }
  set activable(newValue: Activable) {
    this.features[ActorFeatureTypeEnum.ACTIVABLE] = newValue;
  }

  get lock(): Lockable {
    return <Lockable>this.features[ActorFeatureTypeEnum.LOCKABLE];
  }
  set lock(newValue: Lockable) {
    this.features[ActorFeatureTypeEnum.LOCKABLE] = newValue;
  }

  get light(): Light {
    return <Light>this.features[ActorFeatureTypeEnum.LIGHT];
  }
  set light(newValue: Light) {
    this.features[ActorFeatureTypeEnum.LIGHT] = newValue;
  }

  get powerBonus(): number {
    return this.xpHolder
      ? this.xpHolder.demonicFavorLevel + this.xpHolder.xpLevel * 2
      : 0;
  }

  get meleePower(): number {
    const attacker = this.getAttacker();
    return this.powerBonus + (attacker ? attacker.power : 0);
  }
  get defence(): number {
    return this.destructible.computeRealDefence(this);
  }
  get xpHolder(): XpHolder {
    return <XpHolder>this.features[ActorFeatureTypeEnum.XP_HOLDER];
  }
  set xpHolder(newValue: XpHolder) {
    this.features[ActorFeatureTypeEnum.XP_HOLDER] = newValue;
  }

  public isInContainer(): boolean {
    return this.pickable && this.pickable.containerId !== undefined;
  }
  public contains(actorId: ActorId, recursive: boolean): boolean {
    return this.container && this.container.contains(actorId, recursive);
  }

  public getname(count: number = 1): string {
    let name = count > 1 ? this.pluralName : this.name;
    if (this.isPlayer()) {
      return "you";
    }
    if (this.ai && this.ai.hasCondition(ConditionTypeEnum.FROZEN)) {
      return "frozen " + name;
    }
    return name;
  }

  /**
   * Function: getaname
   * Returns " a <name>" or " an <name>" or " <name>"
   */
  public getaname(): string {
    if (this.isPlayer()) {
      return "you";
    }
    if (!this.isSingular()) {
      return " " + this.getname();
    }
    let curName = this.getname();
    let article: string = "aeiou".indexOf(curName[0]) !== -1 ? " an " : " a ";
    return article + curName;
  }

  /**
   * Function: getAname
   * Returns "A <name>" or "An <name>" or "<name>"
   */
  public getAname(): string {
    if (this.isPlayer()) {
      return "You";
    }
    if (!this.isSingular()) {
      return this.getname();
    }
    let curName = this.getname();
    let article: string = "aeiou".indexOf(curName[0]) !== -1 ? "An " : "A ";
    return article + curName;
  }

  /**
   * Function: getTheresaname
   * Returns "There's a <name>" or "There's an <name>" or "There are <name>"
   */
  public getTheresaname(): string {
    let verb = this.isSingular() ? "'s" : " are";
    return "There" + verb + this.getaname();
  }

  /**
   * Function: getthename
   * Returns " the <name>"
   */
  public getthename(count: number = 1): string {
    if (this.isPlayer()) {
      return " you";
    }
    return count === 1
      ? " the " + this.getname()
      : " " + count + " " + this.getname(count);
  }

  /**
   * Function: getThename
   * Returns "The <name>"
   */
  public getThename(count: number = 1): string {
    if (this.isPlayer()) {
      return "You";
    }
    return count === 1
      ? "The " + this.getname()
      : " " + count + " " + this.getname(count);
  }

  /**
   * Function: getThenames
   * Returns "The <name>'s "
   */
  public getThenames(): string {
    if (this.isPlayer()) {
      return "Your ";
    }
    return this.getThename() + "'s ";
  }

  /**
   * Function: getthenames
   * Returns " the <name>'s "
   */
  public getthenames(): string {
    if (this.isPlayer()) {
      return " your ";
    }
    return this.getthename() + "'s ";
  }

  public getits(): string {
    if (this.isPlayer()) {
      return " your ";
    }
    return " its ";
  }

  public getit(): string {
    if (this.isPlayer()) {
      return " you";
    }
    return " it";
  }

  public getis(): string {
    if (this.isPlayer()) {
      return " are";
    }
    return this.isSingular() ? " is" : " are";
  }

  public getVerbEnd(): string {
    if (this.isPlayer()) {
      return "";
    }
    return this.isSingular() ? "s" : "";
  }

  public getInventoryQualifier(): string | undefined {
    let actor: Actor = this;
    for (let clazz of actor.getClasses()) {
      let def: IActorDef = ActorFactory.getActorDef(clazz);
      if (def.containerQualifier) {
        return clazz;
      }
    }
    return undefined;
  }

  public getDescription(count: number = 1): string {
    let desc =
      this.container && !this.isA("creature[s]")
        ? this.container.getQualifiedName(this, count)
        : this.destructible
        ? this.destructible.getQualifiedName(this, count)
        : this.getname(count);
    if (this.magic) {
      if (this.magic.charges > 0) {
        desc += ", " + this.magic.charges + " charges";
      } else {
        desc += ", uncharged";
      }
    }
    if (this.ai) {
      let condDesc: string | undefined = this.ai.getConditionDescription(this);
      if (condDesc) {
        desc += ", " + condDesc;
      }
    }
    return desc;
  }

  public async update() {
    if (this.ai) {
      await this.ai.update(this);
    }
  }
}
