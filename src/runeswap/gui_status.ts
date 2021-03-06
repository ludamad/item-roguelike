/**
 * Section: GUI
 */
import * as Core from "./core/main";
import * as Yendor from "./yendor/main";
import * as Umbra from "./umbra/main";
import * as Gui from "./gui/main";
import * as Actors from "./actors/main";
import * as Map from "./map/main";
import * as Constants from "./base";
import { getEngine } from "./main";
import { findNearestEnemy } from "./map_utils";

/**
 * =============================================================================
 * Group: status panel
 * =============================================================================
 */
export class Message {
  private _color: Core.Color;
  private _text: string;
  constructor(_color: Core.Color, _text: string) {
    this._color = _color;
    this._text = _text;
  }

  get text() {
    return this._text;
  }
  get color() {
    return this._color;
  }
  public darkenColor() {
    this._color = Core.ColorUtils.multiply(
      this._color,
      Constants.LOG_DARKEN_bonus
    );
  }
}

export class StatusPanel
  extends Gui.ConsoleWidget
  implements Umbra.IEventListener {
  private static MESSAGE_X = Constants.STAT_BAR_WIDTH + 2;
  private messageHeight: number;
  private messages: Message[] = [];
  private mouseLookText: string = "";

  public init(width: number, height: number) {
    super.init(width, height);
    this.moveToBottomLeft();
    this.messageHeight = height - 2;
    Umbra.EventManager.registerEventListener(this, Umbra.EVENT_LOG);
  }

  public onTerm() {
    super.onTerm();
    Umbra.EventManager.registerEventListener(this, Umbra.EVENT_LOG);
  }

  public onLog(event: Umbra.ILogEvent) {
    if (event.level === Umbra.LogLevel.DEBUG) {
      return;
    }
    let lines = event.text.split("\n");
    if (this.messages.length + lines.length > this.messageHeight) {
      this.messages.splice(
        0,
        this.messages.length + lines.length - this.messageHeight
      );
    }
    for (let msg of this.messages) {
      msg.darkenColor();
    }
    let col: Core.Color;
    switch (event.level) {
      default:
      case Umbra.LogLevel.INFO:
        col = Constants.LOG_INFO_COLOR;
        break;
      case Umbra.LogLevel.WARN:
        col = Constants.LOG_WARN_COLOR;
        break;
      case Umbra.LogLevel.ERROR:
        col = Constants.LOG_CRIT_COLOR;
        break;
      case Umbra.LogLevel.CRITICAL:
        col = Constants.LOG_CRIT_COLOR;
        break;
    }
    for (let line of lines) {
      this.messages.push(new Message(col, line));
    }
  }

  public onUpdate(_time: number) {
    if (!Map.Map.current) {
      // map not yet created (during newLevel phase)
      return;
    }
    let mousePos: Core.Position = Umbra.getMouseCellPosition();
    let didHandleMouseLook = false;
    if (
      Map.Map.current.contains(mousePos.x, mousePos.y) &&
      Map.Map.current.isExplored(mousePos.x, mousePos.y)
    ) {
      let actorsOnCell: Actors.Actor[] = Actors.Actor.list.filter(
        (actor: Actors.Actor) => actor.pos.equals(mousePos)
      );
      if (actorsOnCell.length > 0) {
        didHandleMouseLook = true;
      }
      this.handleMouseLook(actorsOnCell, mousePos);
    }
    if (!didHandleMouseLook && Actors.Actor.player) {
      mousePos = findNearestEnemy(Actors.Actor.player.pos);
      if (mousePos) {
        let actorsOnCell: Actors.Actor[] = Actors.Actor.list.filter(
          (actor: Actors.Actor) =>
            actor.pos.equals(mousePos) &&
            actor.isA(Constants.ACTOR_TYPES.CREATURE)
        );
        this.handleMouseLook(actorsOnCell, mousePos);
      } else {
        this.mouseLookText = "";
      }
    }
  }

  public onRender(destination: Yendor.Console) {
    let player: Actors.Actor =
      Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
    if (player === undefined) {
      return;
    }
    this.console.clearBack(0x000000);
    this.console.clearText();
    this.console.print(0, 0, this.mouseLookText);
    const hpIsGood = player.destructible.hp * 2 >= player.destructible.maxHp;
    let row = 1;
    this.renderBar(
      1,
      row++,
      Constants.STAT_BAR_WIDTH,
      "Health ",
      player.destructible.hp,
      player.destructible.maxHp,
      hpIsGood
        ? Constants.HEALTH_BAR_GOOD_BACKGROUND
        : Constants.HEALTH_BAR_BACKGROUND,
      hpIsGood
        ? Constants.HEALTH_BAR_GOOD_FOREGROUND
        : Constants.HEALTH_BAR_FOREGROUND
    );
    this.renderBar(
      1,
      row++,
      Constants.STAT_BAR_WIDTH,
      "Mana ",
      player.xpHolder.demonicFavorXp,
      player.destructible.maxHp,
      Constants.FAVOR_BAR_FOREGROUND,
      Constants.FAVOR_BAR_BACKGROUND
    );
    this.renderBar(
      1,
      row++,
      Constants.STAT_BAR_WIDTH,
      "Level " + player.xpHolder.xpLevel + ": ",
      player.xpHolder.xp,
      player.xpHolder.getNextLevelXp(),
      Constants.XP_BAR_BACKGROUND,
      Constants.XP_BAR_FOREGROUND
    );
    this.console.print(1, row, "Power " + player.meleePower);
    this.console.print(10, row, "Defence " + player.defence);

    row++;
    this.console.print(1, row++, getEngine().dungeonDetails.name);
    row++;
    let x = 0;
    this.console.print(1 + x, row, "tab", Constants.BONE_COLOR);
    x += "tab ".length;
    this.console.print(1 + x, row, "autofight");
    x += "autofight   ".length;
    this.console.print(1 + x, row, "o", Constants.BONE_COLOR);
    x += "o ".length;
    this.console.print(1 + x, row, "autoexplore");
    x += "autoexplore   ".length;
    this.console.print(1 + x, row, "i", Constants.BONE_COLOR);
    x += "i ".length;
    this.console.print(1 + x, row, "inventory");
    x += "inventory   ".length;
    this.console.print(1 + x, row, "f", Constants.BONE_COLOR);
    x += "f ".length;
    this.console.print(1 + x, row, "cast spell");
    x += "cast spell   ".length;
    this.console.print(1 + x, row, "g", Constants.BONE_COLOR);
    x += "g ".length;
    this.console.print(1 + x, row, "interact");
    x += "interact   ".length;
    // this.console.print(1 + x, row, "arrows", Constants.BONE_COLOR);
    // x += "arrows ".length;
    // this.console.print(1 + x, row, "move");
    // x += "move   ".length;
    row++;
    // this.console.print(
    //   1,
    //   row++,
    //   "tab autofight   o autoexplore   i inventory   f cast spell"
    // );
    // this.console.print(
    //   1,
    //   row++,
    //   "Capacity " +
    //     player.container.computeTotalWeight().toFixed(1) +
    //     "/" +
    //     player.container.capacity
    // );
    this.renderConditions(player.ai.conditions);
    this.renderMessages();
    super.onRender(destination);
  }

  public clear() {
    this.messages = [];
    this.mouseLookText = "";
  }

  private renderConditions(conditions: Actors.Condition[]) {
    if (!conditions) {
      return;
    }
    for (
      let i: number = 0, len: number = conditions.length;
      i < len && i < 4;
      ++i
    ) {
      let cond: Actors.Condition = conditions[i];
      this.renderBar(
        1,
        4 + i,
        Constants.STAT_BAR_WIDTH,
        cond.getName(),
        cond.time,
        cond.initialTime,
        Constants.CONDITION_BAR_BACKGROUND,
        Constants.CONDITION_BAR_FOREGROUND,
        false
      );
    }
  }

  private handleMouseLook(actors: Actors.Actor[], _pos: Core.Position) {
    let len: number = actors.length;
    this.mouseLookText = "";
    let player: Actors.Actor =
      Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
    if (player) {
      let detectLifeCond: Actors.DetectLifeCondition = <
        Actors.DetectLifeCondition
      >player.ai.getCondition(Actors.ConditionTypeEnum.DETECT_LIFE);
      let detectRange = detectLifeCond ? detectLifeCond.range : 0;
      for (let i: number = 0; i < len; ++i) {
        let actor: Actors.Actor = actors[i];
        if (
          !actor.isInContainer() &&
          Map.Map.current.renderer.getActorRenderMode(actor, detectRange) !==
            Map.ActorRenderModeEnum.NONE
        ) {
          if (i > 0) {
            this.mouseLookText += ",";
          }
          if (actor === player) {
            this.mouseLookText = "you";
          } else if (!actor.destructible) {
            this.mouseLookText += Map.Map.current.renderer.canIdentifyActor(
              actor
            )
              ? actor.getDescription()
              : "";
          } else {
            const damage = player.destructible.computeDamage(
              player,
              actor.meleePower
            );
            const numToKill = Math.ceil(
              actor.destructible.hp /
                actor.destructible.computeDamage(actor, player.meleePower)
            );
            this.mouseLookText += Map.Map.current.renderer.canIdentifyActor(
              actor
            )
              ? actor.getDescription() +
                " " +
                damage +
                " threat / " +
                (numToKill === 1 ? "1 hit left " : numToKill + " hits left ")
              : "?";
          }
        }
      }
    }
  }

  private renderMessages() {
    for (let i: number = 0; i < this.messages.length; ++i) {
      let msg: Message = this.messages[i];
      this.console.print(StatusPanel.MESSAGE_X, i + 1, msg.text, msg.color);
    }
  }

  private renderBar(
    x: number,
    y: number,
    width: number,
    name: string | undefined,
    value: number,
    maxValue: number,
    foreColor: Core.Color,
    backColor: Core.Color,
    displayValues: boolean = true
  ) {
    this.console.clearBack(backColor, x, y, width, 1);
    let barWidth = Math.floor((value / maxValue) * width);
    if (barWidth > 0) {
      this.console.clearBack(foreColor, x, y, barWidth, 1);
    }
    let label: string = name || "";
    if (displayValues && maxValue !== -1) {
      if (name) {
        label += " ";
      }
      label += Math.floor(value) + "/" + Math.floor(maxValue);
    }
    this.console.print(x + Math.floor((width - label.length) / 2), y, label);
  }
}
