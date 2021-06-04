/**
 * Section: Input
 */
import * as Core from "../core/main";
import * as Yendor from "../yendor/main";
import {
  KeyCodeEnum,
  MouseButtonEnum,
  EVENT_START_DRAG,
  EVENT_CANCEL_DRAG,
  EVENT_END_DRAG,
} from "./constants";
import {
  resetAxes,
  updateMouseButtonAxes,
  updateAsciiCodeAxes,
  updateKeyCodeAxes,
} from "./input_virtual";
import { EventManager } from "./events";

interface IButtonStatus {
  /**
   * Field: status
   * Whether the button is currently pressed (true) or released (false)
   */
  status: boolean;

  /**
   * Field: pressed
   * Whether the button was pressed this frame
   */
  pressed: boolean;

  /**
   * Field: released
   * Whether the button was released this frame
   */
  released: boolean;
}

interface IMouseStatus {
  /**
   * Field: pixelPos
   * The current mouse position in pixels (0,0 for the windows top left corner).
   */
  pixelPos: Core.Position;

  /**
   * Field: cellPos
   * The current mouse position in console cells (0,0 for the console top left cell)
   */
  cellPos: Core.Position;

  /**
   * Field: buttons
   */
  buttons: IButtonStatus[];

  /**
   * Field: hasMoved
   * Whether the mouse pointer was moved this frame
   */
  hasMoved: boolean;
}

/**
 * Field: mouseStatus
 * Stores the mouse current status : position and state of each button
 */
let mouseStatus: IMouseStatus = {
  buttons: [],
  cellPos: new Core.Position(),
  hasMoved: false,
  pixelPos: new Core.Position(),
};

/**
 * Field: keyboardStatus
 * Store the state of each key on the keyboard. The map keys are key codes (see <enum KeyCode>)
 */
let keyboardStatus: { [key: number]: IButtonStatus } = {};

/**
 * Field: charPressed
 * Whether a specific char was sent by the keyboard this frame. The map keys are ascii codes.
 */
let charPressed: { [key: number]: boolean } = {};
let dragPos: Core.Position = new Core.Position();
let dragCellPos: Core.Position = new Core.Position();

/**
 * Function: wasMouseMoved
 * Return true if the mouse was moved during this frame
 */
export function wasMouseMoved(): boolean {
  return mouseStatus.hasMoved;
}

/**
 * Function: getMousePixelPosition
 * Returns : the current mouse position in pixels (0,0 for the windows top left corner)
 */
export function getMousePixelPosition(): Core.Position {
  return mouseStatus.pixelPos;
}

/**
 * Function: getMouseCellPosition
 * Returns : the current mouse position in console cells (0,0 for the console top left cell)
 */
export function getMouseCellPosition(): Core.Position {
  return mouseStatus.cellPos;
}

/**
 * Function: getMouseScrollDelta
 * Returns : the current mouse scroll delta
 */
export function getMouseScrollDelta(): Core.Position {
  // TODO
  return new Core.Position();
}

/**
 * Function: isKeyDown
 * Whether a key is currently pressed
 * Parameter:
 * key - the key code to check
 */
export function isKeyDown(key: KeyCodeEnum): boolean {
  return keyboardStatus[key] ? keyboardStatus[key].status : false;
}

/**
 * Function: wasKeyPressed
 * Whether a key was pressed during this frame
 * Parameter:
 * key - the key code to check
 */
export function wasKeyPressed(key: KeyCodeEnum): boolean {
  return keyboardStatus[key] ? keyboardStatus[key].pressed : false;
}

/**
 * Function: wasCharPressed
 * Whether a specific character was sent by the keyboard during this frame
 * Parameter:
 * char - the character (string) or its ascii code (number)
 */
export function wasCharPressed(char: number | string): boolean {
  return typeof char === "string"
    ? charPressed[char.charCodeAt(0)]
    : charPressed[char];
}

/**
 *  Function: wasKeyReleased
 * Whether a key was released during this frame
 * Parameter:
 * key - the key to check
 */
export function wasKeyReleased(key: KeyCodeEnum): boolean {
  return keyboardStatus[key] ? keyboardStatus[key].released : false;
}

/**
 * Function: isMouseButtonDown
 * Whether a mouse button is currently pressed
 * Parameter:
 * buttonNum - the button number (0:left, 1:right, 2: middle)
 */
export function isMouseButtonDown(buttonNum: number): boolean {
  return mouseStatus.buttons[buttonNum]
    ? mouseStatus.buttons[buttonNum].status
    : false;
}

/**
 * Function: wasMouseButtonPressed
 * Whether a mouse button was pressed during this frame
 * Parameter:
 * buttonNum - the button number (0:left, 1:right, 2: middle)
 */
export function wasMouseButtonPressed(buttonNum: number): boolean {
  return mouseStatus.buttons[buttonNum]
    ? mouseStatus.buttons[buttonNum].pressed
    : false;
}

/**
 * Function: wasMouseButtonReleased
 * Whether a mouse button was released during this frame
 * Parameter:
 * buttonNum - the button number (0:left, 1:right, 2: middle)
 */
export function wasMouseButtonReleased(buttonNum: number): boolean {
  return mouseStatus.buttons[buttonNum]
    ? mouseStatus.buttons[buttonNum].released
    : false;
}

/**
 * Function: resetInput
 * Resets all input. After ResetInputAxes all axes return to 0 and all buttons return to 0 for one frame.
 * This can be useful when respawning the player and
 * you don't want any input from keys that might still be held down,
 * or if you want to "consume"" the last frame input so that it doesn't trigger anything else.
 */
export function resetInput() {
  for (
    let i: number = 0, len: number = mouseStatus.buttons.length;
    i < len;
    ++i
  ) {
    if (mouseStatus.buttons[i]) {
      mouseStatus.buttons[i].pressed = false;
      mouseStatus.buttons[i].released = false;
    }
  }
  for (let keyCode in keyboardStatus) {
    if (keyboardStatus.hasOwnProperty(keyCode)) {
      keyboardStatus[keyCode].pressed = false;
      keyboardStatus[keyCode].released = false;
    }
  }
  for (let asciiCode in charPressed) {
    if (charPressed.hasOwnProperty(asciiCode)) {
      charPressed[asciiCode] = false;
    }
  }
  resetAxes();
  mouseStatus.hasMoved = false;
}

export function onMouseMove(
  event: JQueryMouseEventObject,
  console: Yendor.Console
) {
  mouseStatus.pixelPos.x = event.pageX;
  mouseStatus.pixelPos.y = event.pageY;
  if (console) {
    console.getPositionFromPixels(
      event.pageX,
      event.pageY,
      mouseStatus.cellPos
    );
  }
  mouseStatus.hasMoved = true;
}

export function onMouseDown(event: JQueryMouseEventObject) {
  if (!mouseStatus.buttons[event.which]) {
    mouseStatus.buttons[event.which] = {
      pressed: true,
      released: false,
      status: true,
    };
  } else {
    mouseStatus.buttons[event.which].pressed = true;
    mouseStatus.buttons[event.which].released = false;
    mouseStatus.buttons[event.which].status = true;
  }
  dragPos.set(mouseStatus.pixelPos);
  dragCellPos.set(mouseStatus.cellPos);
  if (isMouseButtonDown(MouseButtonEnum.LEFT)) {
    EventManager.publishEvent(EVENT_START_DRAG, {
      startCellPos: dragCellPos,
      startPos: dragPos,
    });
  }
  updateMouseButtonAxes(<MouseButtonEnum>event.which, true);
}

export function onMouseUp(event: JQueryMouseEventObject) {
  if (!mouseStatus.buttons[event.which]) {
    mouseStatus.buttons[event.which] = {
      pressed: false,
      released: true,
      status: false,
    };
  } else {
    mouseStatus.buttons[event.which].pressed = false;
    mouseStatus.buttons[event.which].released = true;
    mouseStatus.buttons[event.which].status = false;
  }
  if (!mouseStatus.pixelPos.equals(dragPos)) {
    EventManager.publishEvent(EVENT_END_DRAG, {
      startCellPos: dragCellPos,
      startPos: dragPos,
    });
  } else {
    EventManager.publishEvent(EVENT_CANCEL_DRAG);
  }
  updateMouseButtonAxes(<MouseButtonEnum>event.which, false);
}

export function onKeypress(event: KeyboardEvent) {
  charPressed[event.charCode] = true;
  updateAsciiCodeAxes(event.charCode);
}

export function onKeydown(event: KeyboardEvent) {
  if (!keyboardStatus[event.keyCode]) {
    keyboardStatus[event.keyCode] = {
      pressed: true,
      released: false,
      status: true,
    };
  } else {
    keyboardStatus[event.keyCode].pressed = true;
    keyboardStatus[event.keyCode].released = false;
    keyboardStatus[event.keyCode].status = true;
  }
  updateKeyCodeAxes(event.keyCode, true);
  event.preventDefault();
}

export function onKeyup(event: KeyboardEvent) {
  if (!keyboardStatus[event.keyCode]) {
    keyboardStatus[event.keyCode] = {
      pressed: false,
      released: true,
      status: false,
    };
  } else {
    keyboardStatus[event.keyCode].pressed = false;
    keyboardStatus[event.keyCode].released = true;
    keyboardStatus[event.keyCode].status = false;
  }
  updateKeyCodeAxes(event.keyCode, false);
  event.preventDefault();
}
