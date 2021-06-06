// import { BspDungeonBuilder, Map, TopologyMap } from "./map/main";
// import * as Actors from "./actors/main";
// import { map } from "jquery";
// import { ACTOR_TYPES, STATUS_PANEL_HEIGHT } from "./base";
// import { dungeonConfig } from "./config_dungeons";

// export interface DungeonFloorEntry {
//   name: string;
//   map: Map;
//   topologyMap: TopologyMap;
//   actors: Actors.Actor[]; // Only for inactive maps
// }

// export interface DungeonFloorDB {
//   entries: { [name: string]: DungeonFloorEntry };
//   currentFloor: string;
// }

// export function createDungeon(): DungeonFloorDB {
//   return {
//     entries: {},
//     currentFloor: "main",
//   };
// }

// export function getFloor(
//   db: DungeonFloorDB,
//   floorName: string
// ): DungeonFloorEntry {
//   if (db.entries[floorName]) {
//     return db.entries[floorName];
//   }
//   const map = new Map(this.renderer);
//   const dungeon: DungeonFloorEntry = {
//     name: floorName,
//     actors: [],
//     map,
//     topologyMap: this.buildMap(this.dungeonLevel, map),
//   };
//   return (db.entries[floorName] = dungeon);
// }
// export function switchToFloor(db: DungeonFloorDB, floorName: string) {
//   const floor = getFloor(db, floorName);
//   db.currentFloor = floorName;

//   // remove all actors but the player, and push them to the actor stash
//   // and its inventory (except unused keys)
//   let player: Actors.Actor =
//     Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
//   for (let actor of Actors.Actor.list) {
//     if (actor !== player) {
//       // Floor before this one
//       this._dungeonData[this.dungeonLevel - 2].actors.push(actor);
//     }
//   }
//   Map.current = floor.map;
// }

// protected buildMap(dungeonLevel: number, map: Map): TopologyMap {
//   map.init(
//     Umbra.application.getConsole().width,
//     Umbra.application.getConsole().height - STATUS_PANEL_HEIGHT
//   );
//   this.renderer.initForNewMap();
//   let dungeonBuilder: BspDungeonBuilder = new BspDungeonBuilder(
//     dungeonLevel,
//     dungeonConfig
//   );
//   dungeonBuilder.build(map);
//   return dungeonBuilder.topologyMap;
// }
