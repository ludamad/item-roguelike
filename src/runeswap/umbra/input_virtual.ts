/**
 * Section: Virtual axes and buttons
 */
import * as con from "./constants";
import { logger } from "./main";

export type ButtonDef = string | number | con.MouseButtonEnum;
export interface IAxisDef {
  name: string;
  positiveDescription?: string;
  negativeDescription?: string;

  /**
   * Field:positiveButton
   * The button used to push the axis in the positive direction.
   */
  positiveButton: ButtonDef;

  /**
   * Field:negativeButton
   * The button used to push the axis in the negative direction.
   */
  negativeButton?: ButtonDef;

  /**
   * Field: altPositiveButton
   * Alternative button used to push the axis in the positive direction.
   */
  altPositiveButton?: ButtonDef;

  /**
   * Field: altNegativeButton
   * Alternative button used to push the axis in the negative direction.
   */
  altNegativeButton?: ButtonDef;

  /**
   * Field: gravity
   * Speed in units per second that the axis falls toward neutral when no buttons are pressed.
   */
  gravity?: number;

  /**
   * Field: deadZone
   * Size of the analog dead zone. All analog device values within this range result map to neutral.
   */
  deadZone?: number;

  /**
   * Field: sensitivity
   * Speed in units per second that the the axis will move toward the target value. This is for digital devices only.
   */
  sensitivity?: number;

  /**
   * Field: snap
   * If enabled, the axis value will reset to zero when pressing a button of the opposite direction.
   */
  snap?: boolean;

  /**
   * Field: invert
   * If enabled, the Negative Buttons provide a positive value, and vice-versa.
   */
  invert?: boolean;

  /**
   * Field: type
   * The type of inputs that will control this axis.
   */
  type: con.AxisTypeEnum;
}

interface IAxisData extends IAxisDef {
  value: number;
  rawValue: number;
  pressed?: boolean;
  released?: boolean;
}

let axesMap: { [name: string]: IAxisData } = {};

/**
 * Field: keyCodeToAxis
 * Maps key codes to corresponding axis
 */
let keyCodeToAxis: { [keyCode: number]: IAxisData } = {};

/**
 * Field: asciiCodeToAxis
 * Maps an ascii code to corresponding axis
 */
let asciiCodeToAxis: { [asciiCode: number]: IAxisData } = {};

/**
 * Field: mouseButtonToAxis
 * Maps mouse buttons (map key = MouseButtonEnum) to corresponding axis
 */
let mouseButtonToAxis: { [mouseButton: number]: IAxisData } = {};

let lastAxisName: string | undefined;

/**
 * Function: registerAxes
 * Register an array of axis or virtual button.
 */
export function registerAxes(data: IAxisDef[]) {
  for (let axis of data) {
    registerAxis(axis);
  }
}

export function getLastAxisName(): string | undefined {
  return lastAxisName;
}

export function updateMouseButtonAxes(
  button: con.MouseButtonEnum,
  pressed: boolean
) {
  let val = pressed ? 1 : 0;
  let axis = mouseButtonToAxis[button];
  if (axis) {
    axis.rawValue = val;
    axis.pressed = pressed;
    axis.released = !pressed;
    if (pressed) {
      lastAxisName = axis.name;
    }
  }
}

export function updateKeyCodeAxes(keyCode: number, pressed: boolean) {
  let val = pressed ? 1 : 0;
  let axis = keyCodeToAxis[keyCode];
  if (axis) {
    axis.rawValue = val;
    axis.pressed = pressed;
    axis.released = !pressed;
    if (pressed) {
      lastAxisName = axis.name;
    }
  }
}

export function updateAsciiCodeAxes(asciiCode: con.MouseButtonEnum) {
  let axis = asciiCodeToAxis[asciiCode];
  if (axis) {
    axis.rawValue = 1;
    axis.pressed = true;
    axis.released = false;
    lastAxisName = axis.name;
  }
}

export function resetAxes() {
  for (let name in axesMap) {
    if (axesMap.hasOwnProperty(name)) {
      if (axesMap[name].pressed) {
        axesMap[name].pressed = false;
      }
      if (axesMap[name].released) {
        axesMap[name].released = false;
      }
    }
  }
  // no keyreleased event for a keypress event. autorelease every frame
  for (let asciiCode in asciiCodeToAxis) {
    if (asciiCodeToAxis.hasOwnProperty(asciiCode)) {
      asciiCodeToAxis[asciiCode].rawValue = 0;
    }
  }
  lastAxisName = undefined;
}

function registerButtonHandler(buttonDef: ButtonDef, data: IAxisData) {
  if (typeof buttonDef === "string") {
    logger.debug("   Umbra.Input : ascii button " + buttonDef);
    asciiCodeToAxis[buttonDef.charCodeAt(0)] = data;
  } else if ((typeof buttonDef as any) === "MouseButtonEnum") {
    // TODO take this type error seriously ^
    logger.debug("   Umbra.Input : mouse button " + buttonDef);
    mouseButtonToAxis[<number>buttonDef] = data;
  } else {
    logger.debug("   Umbra.Input : key button " + buttonDef);
    keyCodeToAxis[buttonDef] = data;
  }
}

/**
 * Function: registerAxis
 * Register a new axis or virtual button.
 */
export function registerAxis(def: IAxisDef) {
  let data: IAxisData = {
    altNegativeButton: def.altNegativeButton,
    altPositiveButton: def.altPositiveButton,
    deadZone: def.deadZone,
    gravity: def.gravity,
    invert: def.invert,
    name: def.name,
    negativeButton: def.negativeButton,
    negativeDescription: def.negativeDescription,
    positiveButton: def.positiveButton,
    positiveDescription: def.positiveDescription,
    rawValue: 0,
    sensitivity: def.sensitivity,
    snap: def.snap,
    type: def.type,
    value: 0,
  };
  axesMap[data.name] = data;
  logger.debug("Umbra.Input : new axis " + data.name + " type " + data.type);
  if (data.altNegativeButton) {
    registerButtonHandler(data.altNegativeButton, data);
  }
  if (data.altPositiveButton) {
    registerButtonHandler(data.altPositiveButton, data);
  }
  if (data.positiveButton) {
    registerButtonHandler(data.positiveButton, data);
  }
  if (data.negativeButton) {
    registerButtonHandler(data.negativeButton, data);
  }
}

/**
 * Function: getAxis
 * Return the value of a virtual axis. In the range -1..1
 * Parameter:
 * name - the axis name
 */
export function getAxis(name: string): number {
  return axesMap[name] ? axesMap[name].value : 0;
}

/**
 * Function: getAxisRaw
 * Return the value of a virtual axis with no smoothing filtering applied. In the range -1..1
 * Parameter:
 * name - the axis name
 */
export function getAxisRaw(name: string): number {
  return axesMap[name] ? axesMap[name].rawValue : 0;
}

/**
 * Function: isButtonDown
 * Whether a virtual button is currently pressed
 * Parameter:
 * name - the KEY_OR_BUTTON axis name
 */
export function isButtonDown(name: string): boolean {
  return axesMap[name] ? axesMap[name].value > 0 : false;
}

/**
 * Function: wasButtonPressed
 * Whether a virtual button was pressed during this frame
 * Parameter:
 * name - the KEY_OR_BUTTON axis name
 */
export function wasButtonPressed(name: string): boolean {
  return axesMap[name] ? !!axesMap[name].pressed : false;
}

/**
 * Function: wasButtonReleased
 * Whether a virtual button was released during this frame
 * Parameter:
 * name - the KEY_OR_BUTTON axis name
 */
export function wasButtonReleased(name: string): boolean {
  return axesMap[name] ? !!axesMap[name].released : false;
}
