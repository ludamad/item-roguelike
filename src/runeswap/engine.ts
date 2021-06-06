import * as Yendor from "./yendor/main";
import * as Umbra from "./umbra/main";
import * as Gui from "./gui/main";
import * as Actors from "./actors/main";
import {
  BasicMapShader,
  BspDungeonBuilder,
  DungeonRendererNode,
  LightDungeonShader,
  Map,
  MapScene,
  TopologyMap,
} from "./map/main";
import {
  EVENT_CHANGE_STATUS,
  EVENT_USE_PORTAL,
  EVENT_NEW_GAME,
  EVENT_OPEN_MAIN_MENU,
  GameStatus,
  MENU_BACKGROUND,
  MENU_BACKGROUND_ACTIVE,
  MENU_FOREGROUND,
  MENU_FOREGROUND_ACTIVE,
  MENU_FOREGROUND_DISABLED,
  TITLE_FOREGROUND,
  PERSISTENCE_VERSION_KEY,
  PERSISTENCE_DUNGEON_LEVEL,
  PERSISTENCE_MAP_KEY,
  PERSISTENCE_TOPOLOGY_MAP,
  PERSISTENCE_STATUS_PANEL,
  STATUS_PANEL_HEIGHT,
  URL_PARAM_CLEAR_SAVEGAME,
  URL_PARAM_NO_ITEM,
  URL_PARAM_NO_MONSTER,
  ACTOR_TYPES,
} from "./base";
import { StatusPanel } from "./gui_status";
import { InventoryPanel } from "./gui_inventory";
import { LootPanel } from "./gui_loot";
import { TilePicker } from "./gui_tilepicker";
import { NumberSelector } from "./gui_input_number";
import { MainMenu } from "./gui_menu";
import { DebugMenu } from "./gui_debug";
import { dungeonConfig } from "./config_dungeons";
import { Actor, ActorId, EventEffect } from "./actors/main";

/**
 * Property: SAVEFILE_VERSION
 * This is the savegame format version. To be incremented when the format changes
 * to keep the game from trying to load data with an old format.
 * This should be an integer.
 */
const SAVEFILE_VERSION: string = "18";

export abstract class DungeonScene
  extends MapScene
  implements Umbra.IEventListener {
  protected _topologyMaps: TopologyMap[] = [];
  public dungeonLevel: number = 1;

  constructor() {
    super(
      new DungeonRendererNode(new LightDungeonShader(new BasicMapShader())),
      new Yendor.IndexedDbPersister()
    );
    dungeonConfig.noItem = Yendor.urlParams[URL_PARAM_NO_ITEM] !== undefined;
    dungeonConfig.noMonster =
      Yendor.urlParams[URL_PARAM_NO_MONSTER] !== undefined;
  }

  get map(): Map {
    return Map.current;
  }
  // singleton getters
  get topologyMap(): TopologyMap {
    return Map.current.topology;
  }
  public onInit(): void {
    super.onInit();
  }

  /**
   * Function: createStairs
   * Create the actors for up and down stairs. The position is not important,
   * actors will be placed by the dungeon builder.
   */
  public createStairs(mapId: number) {
    let stairUp: Actors.Actor | undefined = Actors.ActorFactory.create(
      mapId,
      ACTOR_TYPES.STAIRS_UP
    );
    if (!stairUp) {
      Umbra.logger.critical("Missing actor type " + ACTOR_TYPES.STAIRS_UP);
      return;
    }
    let stairDown: Actors.Actor | undefined = Actors.ActorFactory.create(
      mapId,
      ACTOR_TYPES.STAIRS_DOWN
    );
    if (!stairDown) {
      Umbra.logger.critical("Missing actor type " + ACTOR_TYPES.STAIRS_DOWN);
      return;
    }
  }

  public createPlayer() {
    let player: Actors.Actor | undefined = Actors.ActorFactory.create(
      this.dungeonLevel,
      ACTOR_TYPES.PLAYER,
      this.playerTilePicker,
      this.playerInventoryPicker,
      this.playerLootHandler
    );
    if (!player) {
      Umbra.logger.critical("Missing actor type " + ACTOR_TYPES.PLAYER);
      return;
    }
    Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER] = player;
    player.register();
    let [stairsUp]: Actors.Actor[] = player.map.actorList.filter(
      ({ name }) => name == ACTOR_TYPES.STAIRS_UP
    );
    player.moveTo(stairsUp.pos.x, stairsUp.pos.y);
    Actors.ActorFactory.createInContainer(player, [ACTOR_TYPES.KNIFE]);
    Actors.Actor.describeCell(player.pos);
  }

  protected buildMap(dungeonLevel: number, map: Map): TopologyMap {
    map.init(
      dungeonLevel,
      Umbra.application.getConsole().width,
      Umbra.application.getConsole().height - STATUS_PANEL_HEIGHT
    );
    let dungeonBuilder: BspDungeonBuilder = new BspDungeonBuilder(
      dungeonLevel,
      dungeonConfig
    );
    dungeonBuilder.build(map);
    map.topology = dungeonBuilder.topologyMap;
    // hack - put better place
    let stairsDownIdx = 0,
      stairsUpIdx = 0;
    for (const actor of map.actorList) {
      if (actor.isA(ACTOR_TYPES.STAIRS_DOWN)) {
        const effect = actor.activable.onActivateEffector.effect as EventEffect;
        effect.setEventData({
          portalVariant: stairsDownIdx,
        });
        stairsDownIdx++;
      } else if (actor.isA(ACTOR_TYPES.STAIRS_UP)) {
        const effect = actor.activable.onActivateEffector.effect as EventEffect;
        effect.setEventData({
          portalVariant: stairsUpIdx,
        });
        stairsUpIdx++;
      }
    }
    return dungeonBuilder.topologyMap;
  }
}

/**
 * Class: Engine
 * Handles frame rendering and world updating.
 */
export class Engine extends DungeonScene implements Umbra.IEventListener {
  private status: GameStatus;
  // We use the coordinates and level of the target portal actor
  // We assume there will be some sort of target object in an e..g use of staircase
  // even if it is 'inert'
  private queuedPortalUse?: ActorId;
  private gui: {
    status: StatusPanel;
    inventory: InventoryPanel;
    tilePicker: TilePicker;
    loot: LootPanel;
    mainMenu: MainMenu;
    debugMenu?: DebugMenu;
  };

  public onInit(): void {
    this.status = GameStatus.INITIALIZING;

    super.onInit();
    this.createGui();

    Umbra.EventManager.registerEventListener(this, EVENT_USE_PORTAL);
    Umbra.EventManager.registerEventListener(this, EVENT_CHANGE_STATUS);
    Umbra.EventManager.registerEventListener(this, EVENT_NEW_GAME);

    if (Yendor.urlParams[URL_PARAM_CLEAR_SAVEGAME]) {
      this.onNewGame();
    } else {
      this.persister
        .loadFromKey(PERSISTENCE_VERSION_KEY)
        .then((savedVersion) => {
          if (savedVersion && savedVersion.toString() === SAVEFILE_VERSION) {
            this.loadGame();
          } else {
            this.onNewGame();
          }
        });
    }
  }

  public onTerm() {
    super.onTerm();
    Umbra.EventManager.unregisterEventListener(this, EVENT_USE_PORTAL);
    Umbra.EventManager.unregisterEventListener(this, EVENT_CHANGE_STATUS);
    Umbra.EventManager.unregisterEventListener(this, EVENT_NEW_GAME);
  }

  public onUsePortal(data: {
    mapIdOffset: number;
    portalType: string;
    portalVariant: number;
  }) {
    const mapId = this.dungeonLevel + data.mapIdOffset;
    if (mapId < 0) {
      Umbra.logger.warn(
        "You consider leaving... but your soul would be eaten."
      );

      Umbra.logger.warn("You must obtain 3 valuable artifacts for passage.");
      return;
    }
    this.ensureLevelGenerated(mapId);
    const portals = Map.getActors(mapId).filter(
      (a) => a.name === data.portalType
    );
    const portal = portals[data.portalVariant] || portals[0];
    this.queuedPortalUse = portal.id;
  }

  public onChangeStatus(status: GameStatus) {
    this.status = status;
    if (status === GameStatus.DEFEAT) {
      Umbra.logger.critical("You died!");
    }
  }

  public onNewGame() {
    // (1) delete saved game
    this.deleteSavedGame();
    // (2) wipe salient static data
    this.dungeonLevel = 0;
    Map.currentIndex = 0;
    Map.actorsDb = [[]];
    Map.mapDb = [];
    this.status = GameStatus.RUNNING;
    // (3) generate the first map
    this.ensureLevelGenerated(this.dungeonLevel);
    // (4) spawn the player
    this.createPlayer();
    this.gui.status.clear();
  }

  public onSaveGame(persister: Yendor.IPersister) {
    if (
      Actors.Actor.specialActors[
        Actors.SpecialActorsEnum.PLAYER
      ].destructible.isDead()
    ) {
      this.deleteSavedGame();
    } else {
      persister.saveToKey(PERSISTENCE_DUNGEON_LEVEL, this.dungeonLevel);
      persister.saveToKey(PERSISTENCE_VERSION_KEY, SAVEFILE_VERSION);
      persister.saveToKey(PERSISTENCE_MAP_KEY, Map.mapDb);
      // persister.saveToKey(PERSISTENCE_TOPOLOGY_MAP, this._topologyMap);
      persister.saveToKey(PERSISTENCE_STATUS_PANEL, this.gui.status);
      Actors.ActorFactory.save(persister);
    }
  }

  /**
   * Function: onUpdate
   * Update the game world
   * Parameters:
   * time - elapsed time since the last update in milliseconds
   */
  public onUpdate(time: number): void {
    if (this.status === GameStatus.INITIALIZING) {
      return;
    }

    if (this.status === GameStatus.DEFEAT) {
      return;
    }
    let player: Actors.Actor = Actors.Actor.player;
    // if (this.status === GameStatus.NEXT_LEVEL) {
    //   this.status = GameStatus.RUNNING;
    // } else
    if (this.queuedPortalUse) {
      this.gotoNextLevel(this.queuedPortalUse);
      this.queuedPortalUse = undefined;
      this.status = GameStatus.RUNNING;
      if (player) {
        // the player moved. Recompute the field of view
        this.map.setDirty();
        this.map.computeFov(player.pos.x, player.pos.y, Actors.FOV_RADIUS);
        this.map.updateScentField(player.pos.x, player.pos.y);
      }
      return;
    }
    if (player && !player.destructible.isDead()) {
      let schedulerPaused = player.scheduler.isPaused();
      if (this.status === GameStatus.NEXT_TURN) {
        this.forceNextTurn = true;
        this.status = GameStatus.RUNNING;
      }
      super.onUpdate(time);
      if (!schedulerPaused && player.scheduler.isPaused()) {
        // save every time the scheduler pauses
        this.persister.saveToKey(Actors.PERSISTENCE_ACTORS_KEY, Map.actorsDb);
        this.onSaveGame(this.persister);
      }
    }
    this.handleKeyboardInput();
    const self = this; // hack for this.status typing
    if (
      player &&
      player.destructible.isDead() &&
      self.status !== GameStatus.DEFEAT
    ) {
      Umbra.EventManager.publishEvent(EVENT_CHANGE_STATUS, GameStatus.DEFEAT);
    }
  }

  public onRender(_con: Yendor.Console): void {
    // rendering done by a MapRendererNode
  }

  private createGui() {
    let numberSelector: NumberSelector = new NumberSelector();
    this.gui = {
      inventory: new InventoryPanel(numberSelector),
      loot: new LootPanel(numberSelector),
      mainMenu: new MainMenu(),
      status: new StatusPanel(),
      tilePicker: new TilePicker(),
    };
    if (Yendor.urlParams[Umbra.URL_PARAM_DEBUG]) {
      this.gui.debugMenu = new DebugMenu();
      this.addChild(this.gui.debugMenu);
    }
    this.gui.status.init(
      Umbra.application.getConsole().width,
      STATUS_PANEL_HEIGHT
    );
    this.playerInventoryPicker = this.gui.inventory;
    this.playerTilePicker = this.gui.tilePicker;
    this.playerLootHandler = this.gui.loot;
    this.gui.inventory.resize(
      Umbra.application.getConsole().width,
      Umbra.application.getConsole().height - STATUS_PANEL_HEIGHT
    );
    this.addChild(this.gui.status);
    this.addChild(this.gui.inventory);
    this.addChild(this.gui.mainMenu);
    this.addChild(this.gui.tilePicker);
    this.addChild(this.gui.loot);
    this.addChild(numberSelector);

    // Gui configuration
    Gui.setConfiguration({
      color: {
        background: MENU_BACKGROUND,
        backgroundActive: MENU_BACKGROUND_ACTIVE,
        backgroundDisabled: MENU_BACKGROUND,
        foreground: MENU_FOREGROUND,
        foregroundActive: MENU_FOREGROUND_ACTIVE,
        foregroundDisabled: MENU_FOREGROUND_DISABLED,
        titleForeground: TITLE_FOREGROUND,
      },
      input: {
        cancelAxisName: Actors.PlayerActionEnum[Actors.PlayerActionEnum.CANCEL],
        focusNextWidgetAxisName:
          Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_SOUTH],
        focusPreviousWidgetAxisName:
          Actors.PlayerActionEnum[Actors.PlayerActionEnum.MOVE_NORTH],
        validateAxisName:
          Actors.PlayerActionEnum[Actors.PlayerActionEnum.VALIDATE],
      },
    });
  }

  private async loadGame() {
    try {
      const dungeonLevel = await this.persister.loadFromKey(
        PERSISTENCE_DUNGEON_LEVEL
      );
      this.dungeonLevel = dungeonLevel;
      Map.currentIndex = dungeonLevel;
      Yendor.Persistence.registerConstructor(
        "Map",
        () => new Map(this.renderer)
      );
      await this.persister.loadFromKey(PERSISTENCE_MAP_KEY, Map.mapDb);
      await Actors.ActorFactory.load(this.persister);
      await Actors.Actor.load(this.persister);
      Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER].ai.setPickers(
        this.playerTilePicker,
        this.playerInventoryPicker,
        this.playerLootHandler
      );
      //   return this.persister.loadFromKey(PERSISTENCE_TOPOLOGY_MAP);
      // })
      // .then((topologyMap) => {
      // this._topologyMap = topologyMap;
      this.status = await this.persister.loadFromKey(
        PERSISTENCE_STATUS_PANEL,
        this.gui.status
      );
    } catch (err) {
      Umbra.logger.critical("Error while loading game :" + err);
      this.onNewGame();
    }
  }

  private deleteSavedGame() {
    this.persister.deleteKey(PERSISTENCE_DUNGEON_LEVEL);
    this.persister.deleteKey(PERSISTENCE_VERSION_KEY);
    this.persister.deleteKey(PERSISTENCE_MAP_KEY);
    Actors.ActorFactory.deleteSavedGame(this.persister);
    Actors.Actor.deleteSavedGame(this.persister);
    this.persister.deleteKey(PERSISTENCE_STATUS_PANEL);
  }

  // public newLevel() {
  //   this.dungeonLevel++;
  //   Map.currentIndex = this.dungeonLevel;
  //   Actors.Actor.currentScheduler.clear();
  //   // remove all actors but the player and its inventory (except unused keys)
  //   let player: Actors.Actor =
  //     Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
  //   player.mapId = this.dungeonLevel;
  //   Map.currentActors.push(player);
  //   Actors.Actor.currentScheduler.addAll(Map.currentActors);

  //   this.createStairs();
  // }
  private ensureLevelGenerated(mapId: number): Map {
    if (Map.mapDb[mapId]) {
      return Map.mapDb[mapId];
    }
    const map = new Map(this.renderer);
    while (Map.mapDb.length < mapId) {
      Map.mapDb.push(undefined as any);
    }
    Map.mapDb[mapId] = map;
    this.buildMap(mapId, map);
    return map;
  }
  /**
   * Function: gotoNextLevel
   * Go down one level in the dungeon
   */
  private gotoNextLevel(portalId: ActorId) {
    //   Map.currentIndex = this.dungeonLevel;
    //   // remove all actors but the player and its inventory (except unused keys)
    //   let player: Actors.Actor =
    //     Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
    //   player.mapId = this.dungeonLevel;
    //   Map.currentActors.push(player);

    //   this.createStairs();
    let player: Actors.Actor =
      Actors.Actor.specialActors[Actors.SpecialActorsEnum.PLAYER];
    let portal = Actors.Actor.fromId(portalId);
    if (portal) {
      player.changeMap(portal.mapId);
      const aiActors = Map.getActors(portal.mapId).filter((a) => !!a.ai);
      Actors.Actor.resetCurrentScheduler();
      Actors.Actor.currentScheduler.addAll(aiActors);
      this.dungeonLevel = portal.mapId;
      Map.currentIndex = portal.mapId;
      player.moveTo(portal.pos.x, portal.pos.y);
      // player.destructible.heal(player, player.destructible.maxHp / 2);
      // Umbra.logger.warn(
      //   "You take a moment to rest, and recover your strength."
      // );
      // Umbra.logger.warn(
      //   "After a rare moment of peace, you descend deeper\ninto the heart of the dungeon..."
      // );
      Umbra.logger.warn("Level..." + this.dungeonLevel);
      this.renderer.initForNewMap();
    }
  }

  /**
   * Function: handleKeyboardInput
   * Handle main menu shortcut
   */
  private handleKeyboardInput(): void {
    if (
      Gui.Widget.getActiveModal() === undefined &&
      Actors.getLastPlayerAction() === Actors.PlayerActionEnum.CANCEL
    ) {
      Umbra.resetInput();
      Umbra.EventManager.publishEvent(EVENT_OPEN_MAIN_MENU);
    }
  }
}
