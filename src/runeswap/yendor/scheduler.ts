/**
 * Section: Scheduler
 */
import { BinaryHeap } from "./heap";
/**
 * Class: TimedEntity
 * Something that must be updated every once in a while
 */
export abstract class TimedEntity {
  /**
   * Field: _nextActionTime
   * Time when the next update() should be called. This is an arbitrary value.
   */
  private _nextActionTime: number = 0;

  public getNextActionTime(): number {
    return this._nextActionTime;
  }
  /**
   * Function: update
   * Update the entity and call <wait()>.
   */
  public abstract update(): Promise<void> | void;

  public wait(time: number) {
    this._nextActionTime += time;
  }
}
/**
 * Class: Scheduler
 * Handles timed entities and the order in which they are updated.
 * This class stores a sorted list of entities by waitTime.
 * Each time <run> is called, the game time advances by the lowest entity wait time amount.
 * Every entity with a _nextActionTime in the past is pulled out of the list,
 * updated (which should set its _nextActionTime in the future again),
 * then put back in the list.
 * <TimedEntity.wait> should not be called outside of the <update()> function,
 * else the scheduler's list is not sorted anymore.
 * <Scheduler.remove(entity: TimedEntity)> can be called inside the <update()>
 * function to remove an entity from the scheduler
 * (for example when a creature dies and shouldn't be updated anymore).
 */
export class Scheduler {
  public entities: BinaryHeap<TimedEntity>;
  private paused: boolean = true;
  /** entity being currently updated */
  private currentEntity: TimedEntity | undefined;
  public currentTime: number = 0;

  constructor() {
    this.entities = new BinaryHeap<TimedEntity>((entity: TimedEntity) => {
      return entity.getNextActionTime();
    });
  }

  /**
   * Function: add
   */
  public add(entity: TimedEntity) {
    if (!this.entities.contains(entity)) {
      // Ensure level playing field
      entity.wait(this.currentTime - entity.getNextActionTime());
      this.entities.push(entity);
    }
  }
  public rawAdd(entity: TimedEntity) {
    if (!this.entities.contains(entity)) {
      this.entities.push(entity);
    }
  }

  /**
   * Function: addAll
   */
  public addAll(entities: TimedEntity[]) {
    for (const entity of entities) {
      // Ensure level playing field
      entity.wait(this.currentTime - entity.getNextActionTime());
    }
    this.entities.pushAll(entities);
  }

  /**
   * Functin: contains
   */
  public contains(entity: TimedEntity) {
    return this.entities.contains(entity);
  }

  /**
   * Function: remove
   */
  public remove(entity: TimedEntity) {
    if (entity === this.currentEntity) {
      this.currentEntity = undefined;
    } else {
      this.entities.remove(entity);
    }
  }

  /**
   * Function: clear
   * Remove all timed entities from the scheduler.
   */
  public clear() {
    this.entities.clear();
  }

  /**
   * Function: pause
   * Calling <run> has no effect until <resume> is called.
   * You can use this to wait for a keypress in turn by turn games.
   */
  public pause() {
    this.paused = true;
  }

  /**
   * Function: resume
   */
  public resume() {
    this.paused = false;
  }

  /**
   * Function: isPaused
   */
  public isPaused() {
    return this.paused;
  }

  /**
   * Function: run
   * Update all entities that are ready and put them back in the sorted queue.
   * The update function should increase the entity waitTime.
   */
  public async run() {
    if (this.paused || this.entities.isEmpty()) {
      return;
    }
    let nextEntity: TimedEntity | undefined = this.entities.peek();
    if (!nextEntity) {
      return;
    }
    this.currentTime = nextEntity.getNextActionTime();
    // update all entities with wait time <= 0
    let entitiesToPushBack: TimedEntity[] = [];
    /** the entity that called scheduler.pause() during its update */
    let pausingEntity: TimedEntity | undefined;
    while (
      !this.entities.isEmpty() &&
      nextEntity &&
      nextEntity.getNextActionTime() <= this.currentTime
    ) {
      this.currentEntity = this.entities.pop();
      let oldTime = this.currentEntity.getNextActionTime();
      await this.currentEntity.update();
      if (this.paused && pausingEntity === undefined) {
        pausingEntity = this.currentEntity;
      } else if (this.currentEntity !== undefined) {
        // currentEntity is undefined if it was removed from scheduler during its update
        if (
          !this.paused &&
          this.currentEntity.getNextActionTime() === oldTime &&
          (this.currentEntity as any).name === "player"
        ) {
          console.log("ERROR : scheduler : entity didn't wait after update");
          console.log(new Error().stack);
          throw new Error((this.currentEntity as any).name);
          // this.currentEntity.wait(1);
        }
        entitiesToPushBack.push(this.currentEntity);
      }
      this.currentEntity = undefined;
      nextEntity = this.entities.peek();
    }
    this.entities.pushAll(entitiesToPushBack);
    if (pausingEntity) {
      // push pausing entity last so that it's updated first on next run
      this.entities.push(pausingEntity);
    }
  }
}
