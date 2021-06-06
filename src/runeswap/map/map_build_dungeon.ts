import * as Core from "../core/main";
import * as Yendor from "../yendor/main";
import * as Actors from "../actors/main";
import { TopologyMap, TopologyAnalyzer, Connector } from "./map_topology";
import { Map } from "./map";
import { PUZZLE_STEP_PROBABILITY } from "./constants";
import { ACTOR_TYPES } from "../base";

/**
 * ==============================================================================
 * Group: map building
 * ==============================================================================
 */
export interface IDungeonConfig {
  itemProbabilities: Actors.IProbabilityMap;
  creatureProbabilities: Actors.IProbabilityMap;
  lootContainerType: string;
  lootProbabilities: Actors.IProbabilityMap;
  doorProbabilities: Actors.IProbabilityMap;
  wallLightProbabilities: Actors.IProbabilityMap;
  keyProbabilities: Actors.IProbabilityMap;
  noMonster?: boolean;
  noItem?: boolean;
  minTorches: number;
  maxTorches: number;
  /** name of the behavior tree to use for monsters guarding loots */
  guardAI: string;
}
/**
 * Class: AbstractDungeonBuilder
 * Various dungeon building utilities
 */
export class AbstractDungeonBuilder {
  protected rng: Yendor.Random;
  protected config: IDungeonConfig;
  private mapId: number;
  private _topologyMap: TopologyMap;
  private itemProbabilities: Actors.IProbabilityMap;
  private creatureProbabilities: Actors.IProbabilityMap;
  private lootProbabilities: Actors.IProbabilityMap;
  private doorProbabilities: { [index: string]: number };
  private wallLightProbabilities: { [index: string]: number };
  private keyProbabilities: { [index: string]: number };

  get topologyMap() {
    return this._topologyMap;
  }

  constructor(dungeonLevel: number, config: IDungeonConfig) {
    this.mapId = dungeonLevel;
    this.config = config;
    this.itemProbabilities = config.itemProbabilities;
    this.creatureProbabilities = config.creatureProbabilities;
    this.lootProbabilities = config.lootProbabilities;
    this.doorProbabilities = Actors.ActorFactory.computeLevelProbabilities(
      config.doorProbabilities,
      dungeonLevel
    );
    this.wallLightProbabilities = Actors.ActorFactory.computeLevelProbabilities(
      config.wallLightProbabilities,
      dungeonLevel
    );
    this.keyProbabilities = Actors.ActorFactory.computeLevelProbabilities(
      config.keyProbabilities,
      dungeonLevel
    );
    this.rng = new Yendor.CMWCRandom();
  }

  public build(map: Map) {
    this.digMap(map);
    let analyzer: TopologyAnalyzer = new TopologyAnalyzer();
    // find suitable dungeon entry and exit
    let [stairsDown]: Actors.Actor[] = map.actorList.filter(
      ({ name }) => name == ACTOR_TYPES.STAIRS_DOWN
    );
    let [stairsUp]: Actors.Actor[] = map.actorList.filter(
      ({ name }) => name == ACTOR_TYPES.STAIRS_DOWN
    );
    this._topologyMap = analyzer.buildTopologyMap(map, stairsDown.pos);
    analyzer.findDungeonExits(stairsUp.pos, stairsDown.pos);
    analyzer.buildPuzzle(
      this._topologyMap.getObjectId(stairsUp.pos),
      this._topologyMap.getObjectId(stairsDown.pos)
    );
    this.applyPuzzle();
    this.createWallTorches(map, this.config.minTorches, this.config.maxTorches);
    this.fixWallItems(map);
    // put chests in dead ends
    this.createLoot();
  }

  protected digMap(_map: Map) {
    // to be implemented by descendants
  }

  protected dig(map: Map, x1: number, y1: number, x2: number, y2: number) {
    // sort coordinates
    if (x2 < x1) {
      let tmp: number = x2;
      x2 = x1;
      x1 = tmp;
    }
    if (y2 < y1) {
      let tmp2: number = y2;
      y2 = y1;
      y1 = tmp2;
    }
    // never dig on map border
    if (x1 === 0) {
      x1 = 1;
    }
    if (y1 === 0) {
      y1 = 1;
    }
    if (x2 === map.w - 1) {
      x2--;
    }
    if (y2 === map.h - 1) {
      y2--;
    }
    // dig
    for (let tilex: number = x1; tilex <= x2; tilex++) {
      for (let tiley: number = y1; tiley <= y2; tiley++) {
        if (map.isWall(tilex, tiley)) {
          map.setFloor(tilex, tiley);
        }
      }
    }
  }

  protected createRoom(
    map: Map,
    first: boolean,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    this.dig(map, x1, y1, x2, y2);
    if (first) {
      let [stairsUp]: Actors.Actor[] = map.actorList.filter(
        ({ name }) => name == ACTOR_TYPES.STAIRS_UP
      );
      if (!stairsUp) {
        stairsUp = Actors.ActorFactory.create(
          this.mapId,
          ACTOR_TYPES.STAIRS_UP
        ) as any;
      }
      stairsUp.pos.x = Math.floor((x1 + x2) / 2);
      stairsUp.pos.y = Math.floor((y1 + y2) / 2);
    } else {
      this.createMonsters(x1, y1, x2, y2, map);
      this.createItems(x1, y1, x2, y2, map);
      // stairs down will be in the last room
      let stairs: Actors.Actor[] = map.actorList.filter(
        ({ name }) => name == ACTOR_TYPES.STAIRS_DOWN
      );
      let otherStairs: Actors.Actor[] = map.actorList.filter(
        ({ name }) => name == ACTOR_TYPES.STAIRS_UP
      );
      if (stairs.length === 3 && otherStairs.length < 3) {
        const stairsUp = Actors.ActorFactory.create(
          this.mapId,
          ACTOR_TYPES.STAIRS_UP
        ) as any;
        stairsUp.pos.x = Math.floor((x1 + x2) / 2);
        stairsUp.pos.y = Math.floor((y1 + y2) / 2);
      } else {
        let stairsDown: Actors.Actor;
        if (stairs.length < 3) {
          stairsDown = Actors.ActorFactory.create(
            this.mapId,
            ACTOR_TYPES.STAIRS_DOWN
          ) as any;
        } else {
          stairsDown = stairs[stairs.length - 1];
        }
        stairsDown.pos.x = Math.floor((x1 + x2) / 2);
        stairsDown.pos.y = Math.floor((y1 + y2) / 2);
      }
    }
  }

  protected createDoor(pos: Core.Position) {
    let doorType: string = <string>(
      this.rng.getRandomChance(this.doorProbabilities)
    );
    let door: Actors.Actor | undefined = Actors.ActorFactory.create(
      this.mapId,
      doorType
    );
    if (door) {
      door.register();
      door.moveTo(pos.x, pos.y);
    }
  }

  protected getDoor(pos: Core.Position): Actors.Actor | undefined {
    let doors: Actors.Actor[] = Map.getActors(this.mapId).filter(
      (actor: Actors.Actor) => actor.pos.equals(pos) && actor.isA("door[s]")
    );
    return doors && doors.length === 0 ? undefined : doors[0];
  }

  protected findVDoorPosition(
    map: Map,
    x: number,
    y1: number,
    y2: number
  ): Core.Position | undefined {
    let y = y1 < y2 ? y1 : y2;
    let endy = y1 < y2 ? y2 : y1;
    do {
      if (this.isAVDoorPosition(map, x, y)) {
        return new Core.Position(x, y);
      }
      y++;
    } while (y !== endy + 1);
    return undefined;
  }

  protected findHDoorPosition(
    map: Map,
    x1: number,
    x2: number,
    y: number
  ): Core.Position | undefined {
    let x = x1 < x2 ? x1 : x2;
    let endx = x1 < x2 ? x2 : x1;
    do {
      if (this.isAHDoorPosition(map, x, y)) {
        return new Core.Position(x, y);
      }
      x++;
    } while (x !== endx + 1);
    return undefined;
  }

  protected isADoorPosition(map: Map, x: number, y: number): boolean {
    return this.isAHDoorPosition(map, x, y) || this.isAVDoorPosition(map, x, y);
  }

  protected findFloorTile(
    x: number,
    y: number,
    w: number,
    h: number,
    map: Map
  ): Core.Position {
    let pos: Core.Position = new Core.Position(
      Math.floor(x + w / 2),
      Math.floor(y + h / 2)
    );
    while (map.isWall(pos.x, pos.y)) {
      pos.x++;
      if (pos.x === x + w) {
        pos.x = x;
        pos.y++;
        if (pos.y === y + h) {
          pos.y = y;
        }
      }
    }
    return pos;
  }

  private isEmptyCell(map: Map, x: number, y: number): boolean {
    if (!map.canWalk(x, y)) {
      return false;
    }
    return (
      map.actorList.filter(
        (actor: Actors.Actor) =>
          actor.pos.x === x && actor.pos.y === y && actor.isA("item[s]")
      ).length === 0
    );
  }

  private isAHDoorPosition(map: Map, x: number, y: number): boolean {
    return (
      map.isWall(x, y - 1) &&
      map.isWall(x, y + 1) &&
      this.isEmptyCell(map, x, y) &&
      this.isEmptyCell(map, x + 1, y) &&
      this.isEmptyCell(map, x - 1, y)
    );
  }

  private isAVDoorPosition(map: Map, x: number, y: number): boolean {
    return (
      map.isWall(x - 1, y) &&
      map.isWall(x + 1, y) &&
      this.isEmptyCell(map, x, y) &&
      this.isEmptyCell(map, x, y + 1) &&
      this.isEmptyCell(map, x, y - 1)
    );
  }

  private createActor(probabilityMap: {
    [index: string]: number;
  }): Actors.Actor | undefined {
    let actorType: string = <string>this.rng.getRandomChance(probabilityMap);
    // TODO AI tile and inventory pickers for intelligent creatures
    if (actorType !== undefined) {
      return Actors.ActorFactory.create(
        this.mapId,
        actorType,
        undefined,
        undefined
      );
    }
    return undefined;
  }

  private createMonsters(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    map: Map
  ) {
    // let monsters: Actors.Actor[] = Actors.ActorFactory.createRandomActors(
    //   this.creatureProbabilities,
    //   this.mapId
    // );
    // for (let monster of monsters) {
    //   let x = this.rng.getNumber(x1, x2);
    //   let y = this.rng.getNumber(y1, y2);
    //   if (map.canWalk(x, y)) {
    //     monster.moveTo(x, y);
    //   }
    // }
  }

  private createWallTorches(map: Map, minCount: number, maxCount: number) {
    let count: number = this.rng.getNumber(minCount, maxCount);
    while (count > 0) {
      let wallTorch: Actors.Actor | undefined = this.createActor(
        this.wallLightProbabilities
      );
      if (wallTorch) {
        // the position is not important. it will be fixed after dungeon building. see <fixWallItems()>
        let x = this.rng.getNumber(0, map.w - 1);
        let y = this.rng.getNumber(0, map.h - 1);
        wallTorch.moveTo(x, y);
        wallTorch.register();
      }
      count--;
    }
  }

  private findWallWithAdjacentFloor(map: Map, pos: Core.Position) {
    let foundWall: boolean = false;
    let x: number = pos.x;
    let y: number = pos.y;
    while (!foundWall) {
      if (x === map.w - 1) {
        x = 0;
        if (y === map.h - 1) {
          y = 0;
        } else {
          y = y + 1;
        }
      } else {
        x = x + 1;
      }
      if (x === pos.x && y === pos.y) {
        // scanned the whole map without finding a cell
        return;
      }
      let floorPos = map.isWallWithAdjacentFloor(x, y);
      if (floorPos !== undefined) {
        let actorsOnCell: Actors.Actor[] = map.actorList.filter(
          (actor: Actors.Actor) => actor.pos.x === x && actor.pos.y === y
        );
        if (actorsOnCell.length === 0) {
          foundWall = true;
          pos.moveTo(x, y);
        }
      }
    }
  }

  /**
   * Function: fixWallItems
   * Wall items are placed in the room building phase. Once the dungeon is complete, some wall may have been digged.
   * Wall item can end on a floor tile. Move those back to a wall cell.
   */
  private fixWallItems(map: Map) {
    for (let actor of map.actorList) {
      if (
        actor.wallActor &&
        !map.isWallWithAdjacentFloor(actor.pos.x, actor.pos.y)
      ) {
        this.findWallWithAdjacentFloor(map, actor.pos);
        actor.moveTo(actor.pos.x, actor.pos.y);
        if (actor.light) {
          actor.light.position = actor.pos;
        }
      }
    }
  }

  private createItems(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    map: Map
  ) {
    let items: Actors.Actor[] = Actors.ActorFactory.createRandomActors(
      this.itemProbabilities,
      this.mapId
    );
    for (let item of items) {
      if (item.wallActor) {
        let x = this.rng.getNumber(x1, x2);
        let y = this.rng.getNumber(y1, y2);
        // no need to check that x,y is a wall cell. see <fixWallItems()>
        item.moveTo(x, y);
      } else {
        for (let i = 0; i < 100; i++) {
          let x = this.rng.getNumber(x1, x2);
          let y = this.rng.getNumber(y1, y2);
          if (map.canWalk(x, y)) {
            item.moveTo(x, y);
            break;
          }
        }
        if (!map.canWalk(item.pos.x, item.pos.y)) {
          console.log("CANT", item.name);
        }
      }
    }
  }

  /**
   * Function: applyPuzzle
   * actually implement the puzzle by locking doors and putting keys in the dungeon
   */
  private applyPuzzle() {
    for (let puzzleStep of this._topologyMap.puzzle) {
      let prob: number = this.rng.getNumber(0.0, 1.0);
      if (prob > PUZZLE_STEP_PROBABILITY) {
        // skip this lock
        continue;
      }
      let connector: Connector = this._topologyMap.getConnector(
        puzzleStep.connectorId
      );
      let door: Actors.Actor | undefined = this.getDoor(connector.pos);
      if (!door) {
        throw "Error : connector " + connector.id + " with no door";
      }
      // found a door to be locked. look for a position for the key
      let pos: Core.Position = this._topologyMap.getRandomPositionInSector(
        puzzleStep.keySectorId,
        this.rng
      );
      let key: Actors.Actor | undefined = this.createActor(
        this.keyProbabilities
      );
      if (key) {
        key.moveTo(pos.x, pos.y);
        key.register();
        Actors.ActorFactory.setLock(door, key);
      }
    }
  }

  private createLoot() {
    let [stairsUp]: Actors.Actor[] = Map.getActors(this.mapId).filter(
      ({ name }) => name == ACTOR_TYPES.STAIRS_UP
    );
    let entranceSectorId: number = this._topologyMap.getObjectId(stairsUp.pos);
    for (let sector of this._topologyMap.sectors) {
      if (sector.id !== entranceSectorId && sector.isDeadEnd()) {
        let container:
          | Actors.Actor
          | undefined = Actors.ActorFactory.createRandomActor(
          this.mapId,
          this.config.lootContainerType
        );
        if (container) {
          let containerPos: Core.Position = this._topologyMap.getRandomPositionInSector(
            sector.id,
            this.rng
          );
          container.moveTo(containerPos.x, containerPos.y);
          let items: Actors.Actor[] = Actors.ActorFactory.createRandomActors(
            this.lootProbabilities,
            this.mapId
          );
          for (let actor of items) {
            actor.moveTo(containerPos.x, containerPos.y);
            actor.pickable.pick(actor, container, false, true);
          }
          let guardians: Actors.Actor[] = Actors.ActorFactory.createRandomActors(
            this.creatureProbabilities,
            this.mapId
          );
          for (let creature of guardians) {
            let pos: Core.Position = this._topologyMap.getRandomPositionInSector(
              sector.id,
              this.rng
            );
            creature.moveTo(pos.x, pos.y);
            creature.ai.behaviorTree = Actors.ActorFactory.getBehaviorTree(
              this.config.guardAI
            );
            if (!container) {
              throw new Error("No container found!");
            }
            creature.ai.targetId = container.id;
          }
        }
      }
    }
  }
}
