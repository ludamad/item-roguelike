import * as Core from "./core/main";

export const MAIN_MODULE_NAME: string = "Game";

// URL parameters
export const URL_PARAM_NO_MONSTER: string = "nomonster";
export const URL_PARAM_NO_ITEM: string = "noitem";
export const URL_PARAM_CLEAR_SAVEGAME: string = "clearsavegame";

// rendering
export const MENU_BACKGROUND: Core.Color = 0x272822;
export const MENU_BACKGROUND_ACTIVE: Core.Color = 0x383830;
export const MENU_FOREGROUND: Core.Color = 0xfd971f;
export const MENU_FOREGROUND_ACTIVE: Core.Color = 0xffdf90;
export const MENU_FOREGROUND_DISABLED: Core.Color = 0x5c714b;
export const TITLE_FOREGROUND: Core.Color = 0xffffff;
export const HEALTH_BAR_BACKGROUND: Core.Color = 0xff3f3f;
export const HEALTH_BAR_FOREGROUND: Core.Color = 0x7f3f3f;
export const XP_BAR_BACKGROUND: Core.Color = 0x9f3fff;
export const XP_BAR_FOREGROUND: Core.Color = 0x3f007f;
export const CONDITION_BAR_BACKGROUND: Core.Color = 0x3f9f3f;
export const CONDITION_BAR_FOREGROUND: Core.Color = 0x007f3f;
export const INVENTORY_BACKGROUND_ACTIVE: Core.Color = 0x383830;
export const INVENTORY_FOREGROUND_ACTIVE: Core.Color = 0xffdf90;
export const INVENTORY_BACKGROUND_EQUIPPED: Core.Color = 0x585850;
export const LOG_INFO_COLOR: Core.Color = 0xeeeeee;
export const LOG_WARN_COLOR: Core.Color = 0xffa500;
export const LOG_CRIT_COLOR: Core.Color = 0xff2222;
export const TILEPICKER_OK_COLOR: Core.Color = 0x00ff00;
export const TILEPICKER_KO_COLOR: Core.Color = 0xff2222;

// some material colors
export const DARK_WOOD_COLOR: Core.Color = 0x2c1e14;
export const WOOD_COLOR: Core.Color = 0x7d320b;
export const LIGHT_COLOR: Core.Color = 0xdf9f48;
export const IVORY_COLOR: Core.Color = 0xdfd8bb;
export const PAPER_COLOR: Core.Color = 0xc4d67e;
export const BONE_COLOR: Core.Color = 0xffd184;
export const IRON_COLOR: Core.Color = 0x7b7d7a;
export const STEEL_COLOR: Core.Color = 0x828388;
export const BRONZE_COLOR: Core.Color = 0x925c1e;
export const SILVER_COLOR: Core.Color = 0x9a938d;
export const GOLD_COLOR: Core.Color = 0xc49e2c;
export const CANDLE_LIGHT_COLOR: Core.Color = 0xdddd44;
export const TORCH_LIGHT_COLOR: Core.Color = 0xffff44;
export const SUNROD_LIGHT_COLOR: Core.Color = 0xeeeeff;
export const NOLIGHT_COLOR: Core.Color = 0x444444;
export const HEALTH_POTION_COLOR: Core.Color = 0x800080;
export const OIL_FLASK_COLOR: Core.Color = 0xaf5320;

// gui
export const LOG_DARKEN_COEF: number = 0.8;
export const STATUS_PANEL_HEIGHT: number = 7;
export const STAT_BAR_WIDTH: number = 20;
export const CONTAINER_SCREEN_MIN_WIDTH: number = 30;
export const CONTAINER_SCREEN_MIN_HEIGHT: number = 16;

// map building
export const ROOM_MAX_SIZE: number = 8;
export const ROOM_MIN_SIZE: number = 4;
export const DUNGEON_MAX_TORCHES: number = 10;
export const DUNGEON_MIN_TORCHES: number = 4;

// gameplay
// how often the world is updated
export const TICKS_PER_SECOND: number = 10;
export const TICK_LENGTH: number = 1.0 / TICKS_PER_SECOND;
export const INVENTORY_MANIPULATION_TIME: number = 2;
// xp level required for level 1
export const XP_BASE_LEVEL: number = 200;
// xp level required for level n = BASE_LEVEL + n * NEW_LEVEL
export const XP_NEW_LEVEL: number = 150;

// A.I.
export const SCENT_THRESHOLD: number = 10;
export const MIN_GUARD_RANGE: number = 3;
export const MAX_GUARD_RANGE: number = 15;
export const CTX_KEY_GUARD: string = "guard";

// persistence local storage keys
export const PERSISTENCE_VERSION_KEY: string = "version";
export const PERSISTENCE_DUNGEON_LEVEL: string = "dungeonLevel";
export const PERSISTENCE_STATUS_PANEL: string = "statusPanel";
export const PERSISTENCE_MAP_KEY: string = "map";
export const PERSISTENCE_TOPOLOGY_MAP: string = "topologyMap";

// event types
/** open the main menu. No associated data */
export const EVENT_OPEN_MAIN_MENU: string = "OPEN_MAIN_MENU";
export const EVENT_OPEN_DEBUG_MENU: string = "OPEN_DEBUG_MENU";
export const EVENT_NEW_GAME: string = "NEW_GAME";
export const EVENT_CHANGE_STATUS: string = "CHANGE_STATUS";

export const enum GameStatus {
  INITIALIZING = 1,
  // go to next level
  NEXT_LEVEL,
  // game is running
  RUNNING,
  // force a new turn, then goes back to RUNNING or DEFEAT if player died
  NEXT_TURN,
  // player won
  VICTORY,
  // player died
  DEFEAT,
}
