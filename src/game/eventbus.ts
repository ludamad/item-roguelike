module Game {
	"use strict";

	export const enum MouseButton {
		LEFT = 1,
		MIDDLE = 2,
		RIGHT = 3
	}

	export const enum EventType {
		// change game status. Associated data : GameStatus
		CHANGE_STATUS,
		// save the game. no data associated
		SAVE_GAME,
		// key press event. Associated data : KeyInput
		KEYBOARD_INPUT,
		// sends a message to the log. Associated data : Message containing the text and the color
		LOG_MESSAGE,
		// mouse movement. Associated data : Yendor.Position with mouse coordinates on the root console
		MOUSE_MOVE,
		// mouse button press event. Associated data : MouseButton
		MOUSE_CLICK,
		// open the tile picker. Associated data : TilePickerListener
		PICK_TILE,
		// open the inventory
		OPEN_INVENTORY,
		// open the main menu
		OPEN_MAIN_MENU,
		REMOVE_ACTOR,
		// starts a new game
		NEW_GAME,
		// player gains xp. Associated data : number (xp amount)
		GAIN_XP,
	}

	export class Event<T> {
		private _type: EventType;
		private _data: T;
		constructor(_type: EventType, _data?: T) {
			this._type = _type;
			this._data = _data;
		}
		get type() { return this._type; }
		get data() { return this._data; }
	}
	export interface EventListener {
		processEvent( ev: Event<any> );
	}
	export class EventBus {
		private listeners: Array<EventListener[]> = [];

		registerListener(listener: EventListener, type: EventType) {
			if (!this.listeners[type]) {
				this.listeners[type] = new Array<EventListener>();
			}
			this.listeners[type].push(listener);
		}

		unregisterListener(listener: EventListener, type: EventType) {
			if (this.listeners[type]) {
				var index: number = this.listeners[type].indexOf(listener);
				if ( index > -1 ) {
					this.listeners[type].splice(index, 1);
				}
			}
		}

		publishEvent( event: Event<any>) {
			if ( this.listeners[event.type] ) {
				var selectedListeners: EventListener[] = this.listeners[event.type];
				for ( var i = 0; i < selectedListeners.length; i++) {
					selectedListeners[i].processEvent(event);
				}
			}
		}
	}
}
