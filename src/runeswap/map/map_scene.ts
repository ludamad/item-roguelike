import * as Yendor from "../yendor/main";
import * as Gui from "../gui/main";
import * as Umbra from "../umbra/main";
import * as Actors from "../actors/main";
import { MapRendererNode } from "./map_render";
import { Map } from "./map";

export abstract class MapScene
  extends Umbra.Scene
  implements Umbra.IEventListener {
  public enableEvents: boolean = true;

  protected persister: Yendor.IPersister;
  protected _rng: Yendor.Random;
  protected renderer: MapRendererNode;
  protected playerTilePicker: Actors.ITilePicker;
  protected playerInventoryPicker: Actors.IInventoryItemPicker;
  protected playerLootHandler: Actors.ILootHandler;
  protected forceNextTurn: boolean = false;

  constructor(renderer: MapRendererNode, persister: Yendor.IPersister) {
    super();
    this.renderer = renderer;
    this.persister = persister;
  }

  // singleton getters
  abstract get map(): Map;
  get rng() {
    return this._rng;
  }

  public onInit(): void {
    Umbra.EventManager.registerEventListener(
      this,
      Gui.EventType[Gui.EventType.MODAL_SHOW]
    );
    Umbra.EventManager.registerEventListener(
      this,
      Gui.EventType[Gui.EventType.MODAL_HIDE]
    );

    this._rng = new Yendor.CMWCRandom();
    // adding nodes as children ensure they are updated/rendered by Umbra
    this.addChild(this.renderer);

    // Umbra player input configuration
    Umbra.registerAxes([
      // cardinal movements
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_WEST],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_LEFT,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_WEST],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_NUMPAD4,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_WEST],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_H,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_EAST],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_RIGHT,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_EAST],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_NUMPAD6,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_EAST],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_L,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_NORTH],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_UP,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_NORTH],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_NUMPAD8,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_NORTH],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_K,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_SOUTH],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_DOWN,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_SOUTH],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_NUMPAD2,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_SOUTH],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_J,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.WAIT],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_5,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      // movement
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.WAIT],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_NUMPAD5,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.WAIT],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_SPACE,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.GRAB],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_G,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.USE_ITEM],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_I,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.DROP_ITEM],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_D,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.THROW_ITEM],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_T,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.VALIDATE],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_ENTER,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTOEXPLORE],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_O,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTOFIGHT],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_U,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTOFIGHT],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_TAB,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTOUP],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_LESSTHAN,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTOUP],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_COMMA,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTODOWN],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_MORETHAN,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.AUTODOWN],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_PERIOD,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.VALIDATE],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_RETURN,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.CANCEL],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_ESCAPE,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.FIRE],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_F,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.ZAP],
        positiveButton: Umbra.KeyCodeEnum.DOM_VK_Z,
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      // {
      //   name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.ACTIVATE],
      //   positiveButton: Umbra.KeyCodeEnum.DOM_VK_E,
      //   type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      // },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_DOWN],
        positiveButton: ">",
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
      {
        name: Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_UP],
        positiveButton: "<",
        type: Umbra.AxisTypeEnum.KEY_OR_BUTTON,
      },
    ]);
  }

  public onTerm() {
    super.onTerm();
    Umbra.EventManager.unregisterEventListener(
      this,
      Gui.EventType[Gui.EventType.MODAL_SHOW]
    );
    Umbra.EventManager.unregisterEventListener(
      this,
      Gui.EventType[Gui.EventType.MODAL_HIDE]
    );
  }

  public onModalShow(_w: Gui.Widget) {
    Actors.Actor.currentScheduler.pause();
  }

  public onModalHide(_w: Gui.Widget) {
    Actors.Actor.currentScheduler.resume();
  }
  /**
   * Function: onUpdate
   * Triggers actors' A.I. during a new game turn.
   */
  public onUpdate(_time: number) {
    if (
      this.forceNextTurn ||
      (Gui.Widget.getActiveModal() === undefined &&
        Actors.getLastPlayerAction() !== undefined)
    ) {
      this.forceNextTurn = false;
      Actors.Actor.currentScheduler.resume();
    }
    if (Actors.Actor.currentScheduler.isPaused()) {
      return;
    }
    let player: Actors.Actor =
      Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
    if (player) {
      let oldPlayerMapId: number = player.mapId;
      let oldPlayerX: number = player.pos.x;
      let oldPlayerY: number = player.pos.y;
      Actors.Actor.currentScheduler.run();
      if (
        player.mapId !== oldPlayerMapId ||
        player.pos.x !== oldPlayerX ||
        player.pos.y !== oldPlayerY
      ) {
        // the player moved. Recompute the field of view
        this.map.setDirty();
        this.map.computeFov(player.pos.x, player.pos.y, Actors.FOV_RADIUS);
        this.map.updateScentField(player.pos.x, player.pos.y);
      }
    }
  }
}
