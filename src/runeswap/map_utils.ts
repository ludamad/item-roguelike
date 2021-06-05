import { Map } from "./map/main";
import * as Core from "./core/main";
import { Actor } from "./actors/main";
import { PathFinder } from "./yendor/main";
import { ACTOR_TYPES } from "./base";
import { ObservablePoint } from "pixi.js";

export function isEmpty(pos: Core.Position): boolean {
  for (let obj of Actor.list) {
    if (obj.pos.equals(pos)) {
      return false;
    }
  }
  return true;
}
export function isBlocked(pos: Core.Position): boolean {
  for (let obj of Actor.list) {
    if (obj.pos.equals(pos) && obj.blocks) {
      return true;
    }
  }
  return false;
}

function isVisibleHostile({ x, y }: Core.Position): boolean {
  for (let actor of Actor.list) {
    if (
      Map.current.isInFov(actor.pos.x, actor.pos.y) &&
      actor.pos.x === x &&
      actor.pos.y === y &&
      actor.isA(ACTOR_TYPES.HOSTILE_HUMANOID) &&
      !actor.destructible.isDead()
    ) {
      return true;
    }
  }
  return false;
}
function isNearUnexplored(pos: Core.Position): boolean {
  const isActorOrFree = !Map.current.isWall(pos.x, pos.y) && !isBlocked(pos);
  return isActorOrFree && !Map.current.isExplored(pos.x, pos.y); // && Map.current.isAdjacentUnexplored(pos.x, pos.y);
}

export function adjacentPositionTowards(
  owner: Actor,
  pos: Core.Position
): Core.Position | undefined {
  if (pos.isAdjacent(owner.pos, false)) {
    return pos;
  }
  const pathFinder = new PathFinder(
    Map.current.w,
    Map.current.h,
    function (_from: Core.Position, to: Core.Position): number {
      return Map.current.canWalk(to.x, to.y) ? 1 : 0;
    },
    undefined,
    false
  );
  const path = pathFinder.getPath(owner.pos, pos);
  if (!path) {
    return undefined;
  }
  return path.pop();
}
type MapCondition = (pos: Core.Position) => boolean;

export function findNearestEmpty(seed: Core.Position) {
  return findNearestWalkable(seed, isEmpty);
}

export function findNearestUnexplored(seed: Core.Position) {
  return findNearestWalkable(seed, isNearUnexplored);
}

export function findNearestEnemy(seed: Core.Position) {
  return findNearestWalkable(seed, isVisibleHostile);
}

function findNearestWalkable(
  seed: Core.Position,
  condition: MapCondition
): Core.Position | undefined {
  let cellsToVisit: Core.Position[] = [];
  if (condition(seed)) {
    // fast path
    return seed;
  }
  cellsToVisit.push(seed);
  const visited: { [s: string]: boolean } = {};
  while (cellsToVisit.length > 0) {
    let pos: Core.Position | undefined = cellsToVisit.shift();
    if (condition(pos)) {
      return pos;
    }
    if (!pos || !Map.current.canWalk(pos.x, pos.y) || visited[pos.toString()]) {
      continue;
    }
    visited[pos.toString()] = true;
    let adjacentCells: Core.Position[] = pos.getAdjacentCells(
      Map.current.w,
      Map.current.h,
      false
    );
    for (let curPos of adjacentCells) {
      cellsToVisit.push(curPos);
    }
  }
  return undefined;
}
