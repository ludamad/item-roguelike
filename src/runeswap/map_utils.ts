import { Map } from "./map/main";
import * as Core from "./core/main";
import { Actor } from "./actors/main";
import { PathFinder } from "./yendor/main";
import { ACTOR_TYPES } from "./base";
import { ObservablePoint } from "pixi.js";

export function isEmpty(pos: Core.Position): boolean {
  if (Map.current.isWall(pos.x, pos.y)) {
    return false;
  }
  for (let obj of Actor.list) {
    if (obj.pos.equals(pos)) {
      return false;
    }
  }
  return true;
}
export function isBlocked(pos: Core.Position): boolean {
  if (Map.current.isWall(pos.x, pos.y)) {
    return true;
  }
  for (let obj of Actor.list) {
    if (obj.pos.equals(pos) && obj.blocks) {
      return true;
    }
  }
  return false;
}

function hasOpenableDoor({ x, y }: Core.Position) {
  for (const actor of Map.currentActors) {
    if (actor.pos.x === x && actor.pos.y === y) {
      if (actor.isA(ACTOR_TYPES.DOOR)) {
        if (actor.lock && actor.lock.isLocked()) {
          if (!Actor.player.contains(actor.lock.keyId, true)) {
            // Locked and don't have the key - continue
            continue;
          }
        }
        return true;
      }
    }
  }
  return false;
}

function isDoorNearUnexplored({ x, y }: Core.Position) {
  for (const actor of Map.currentActors) {
    if (actor.pos.x === x && actor.pos.y === y) {
      if (!Map.current.isExplored(x, y)) {
        continue;
      }
      if (actor.isA(ACTOR_TYPES.DOOR)) {
        if (actor.lock && actor.lock.isLocked()) {
          if (!Actor.player.contains(actor.lock.keyId, true)) {
            // Locked and don't have the key - continue
            continue;
          }
        }
        if (Map.current.isAdjacentUnexplored(x, y)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isVisibleHostile({ x, y }: Core.Position): boolean {
  for (const actor of Actor.list) {
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

function isStairsUp({ x, y }: Core.Position): boolean {
  for (const actor of Map.currentActors) {
    if (!actor.getWearer() && actor.pos.x === x && actor.pos.y === y) {
      if (!Map.current.isExplored(x, y)) {
        continue;
      }
      if (actor.isA(ACTOR_TYPES.STAIRS_UP)) {
        return true;
      }
    }
  }
  return false;
}

function isStairsDown({ x, y }: Core.Position): boolean {
  for (const actor of Map.currentActors) {
    if (!actor.getWearer() && actor.pos.x === x && actor.pos.y === y) {
      if (!Map.current.isExplored(x, y)) {
        continue;
      }
      if (actor.isA(ACTOR_TYPES.STAIRS_DOWN)) {
        return true;
      }
    }
  }
  return false;
}
function hasAutopickupItem({ x, y }: Core.Position): boolean {
  for (const actor of Map.currentActors) {
    if (!actor.getWearer() && actor.pos.x === x && actor.pos.y === y) {
      if (!Map.current.isExplored(x, y)) {
        continue;
      }
      const isAutopickup = (actor: Actor) => {
        return (
          actor.isA(ACTOR_TYPES.KEY) ||
          actor.isA(ACTOR_TYPES.POTION) ||
          actor.isA(ACTOR_TYPES.GOLD_PIECE) ||
          actor.isA(ACTOR_TYPES.SCROLL)
        );
      };
      if (
        isAutopickup(actor) ||
        (actor.isA(ACTOR_TYPES.STATIC_CONTAINER) &&
          actor.container.containsCriteria(isAutopickup, true))
      ) {
        return true;
      }
    }
  }
  return false;
}

export function pathTowards(
  owner: Actor,
  pos: Core.Position
): Core.Position[] | undefined {
  if (pos.isAdjacent(owner.pos, false)) {
    return [pos];
  }
  const pathFinder = new PathFinder(
    Map.current.w,
    Map.current.h,
    function (_from: Core.Position, to: Core.Position): number {
      return to.equals(pos) ||
        hasOpenableDoor(to) ||
        Map.current.canWalk(to.x, to.y)
        ? 1
        : 0;
    },
    undefined,
    false
  );
  const path = pathFinder.getPath(owner.pos, pos, 200);
  return path;
}
export function adjacentPositionTowards(
  owner: Actor,
  pos: Core.Position
): Core.Position | undefined {
  const path = pathTowards(owner, pos);
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
export function findNearestStairsUp(seed: Core.Position) {
  return findNearestWalkable(seed, isStairsUp);
}
export function findNearestStairsDown(seed: Core.Position) {
  return findNearestWalkable(seed, isStairsDown);
}

export function findAutopickupItem(seed: Core.Position) {
  return findNearestWalkable(seed, hasAutopickupItem);
}

export function findDoorNearUnexplored(seed: Core.Position) {
  return findNearestWalkable(seed, isDoorNearUnexplored);
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
    if (pos && condition(pos)) {
      return pos;
    }
    if (
      !pos ||
      (!Map.current.canWalk(pos.x, pos.y) && !hasOpenableDoor(pos)) ||
      visited[pos.toString()]
    ) {
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
