import * as Actors from "./actors/main";
import { IActorProbability } from "./actors/main";

export function getMonEntries(
  xpLow: number,
  xpHigh: number,
  levelLow: number,
  levelHigh: number
): IActorProbability[] {
  const entries: IActorProbability[] = [];
  for (const [clazz, v] of Object.entries(Actors.ActorFactory.actorDefs)) {
    if (
      v.destructible &&
      v.destructible.xp &&
      v.destructible.xp >= xpLow &&
      v.destructible.xp <= xpHigh
    ) {
      entries.push({
        clazz,
        prob: [
          [levelLow, 30],
          [levelHigh, 0],
        ],
      });
    }
  }
  return entries;
}
