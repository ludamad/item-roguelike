/*
	Section: GUI
*/
module Game {
    "use strict";

	/********************************************************************************
	 * Group: status panel
	 ********************************************************************************/
    export class Message implements Persistent {
        className: string;
        private _color: Core.Color;
        private _text: string;
        constructor(_color: Core.Color, _text: string) {
            this.className = "Message";
            this._color = _color;
            this._text = _text;
        }

        get text() { return this._text; }
        get color() { return this._color; }
        darkenColor() {
            this._color = Core.ColorUtils.multiply(this._color, Constants.LOG_DARKEN_COEF);
        }
    }

    export class StatusPanel extends Gizmo.ConsoleWidget implements Umbra.EventListener, Persistent {
        private static MESSAGE_X = Constants.STAT_BAR_WIDTH + 2;
        className: string;
        private messageHeight: number;
        private messages: Message[] = [];
        private mouseLookText: string = "";
        constructor(width: number, height: number) {
            super(width, height);
            this.className = "StatusPanel";
            this.messageHeight = height - 1;
            Umbra.EventManager.registerEventListener(this, EventType[EventType.LOG_MESSAGE]);
            Umbra.EventManager.registerEventListener(this, EventType[EventType.NEW_GAME]);
            Umbra.EventManager.registerEventListener(this, EventType[EventType.LOAD_GAME]);
            Umbra.EventManager.registerEventListener(this, EventType[EventType.SAVE_GAME]);
            Umbra.EventManager.registerEventListener(this, EventType[EventType.DELETE_SAVEGAME]);
        }

        onLogMessage(msg: Message) {
            var lines = msg.text.split("\n");
            if (this.messages.length + lines.length > this.messageHeight) {
                this.messages.splice(0, this.messages.length + lines.length - this.messageHeight);
            }
            for (var i: number = 0; i < this.messages.length; ++i) {
                this.messages[i].darkenColor();
            }
            for (var j: number = 0; j < lines.length; ++j) {
                this.messages.push(new Message(msg.color, lines[j]));
            }
        }
        
        onNewGame() {
            this.clear();
        }
        
        onLoadGame() {
            Engine.instance.persister.loadFromKey(Constants.PERSISTENCE_STATUS_PANEL, this);            
        }
        
        onSaveGame() {
            Engine.instance.persister.saveToKey(Constants.PERSISTENCE_STATUS_PANEL, this);            
        }
        
        onDeleteSavegame() {
            Engine.instance.persister.deleteKey(Constants.PERSISTENCE_STATUS_PANEL);
        }

        handleMouseMove() {
            var mousePos: Core.Position = Umbra.Input.getMouseCellPosition();
            if (Engine.instance.map.contains(mousePos.x, mousePos.y) && Engine.instance.map.isExplored(mousePos.x, mousePos.y)) {
                var actorsOnCell: Actor[] = Engine.instance.actorManager.filter(function(actor: Actor): boolean {
                    return actor.x === mousePos.x && actor.y === mousePos.y;
                });
                this.handleMouseLook(actorsOnCell, mousePos);
            }
        }

        onRender(destination: Yendor.Console) {
            this.console.clearBack(0x000000);
            this.console.clearText();
            var player: Player = Engine.instance.actorManager.getPlayer();
            this.console.print(0, 0, this.mouseLookText);
            this.renderBar(1, 1, Constants.STAT_BAR_WIDTH, "HP", player.destructible.hp,
                player.destructible.maxHp, Constants.HEALTH_BAR_BACKGROUND, Constants.HEALTH_BAR_FOREGROUND);
            this.renderBar(1, 2, Constants.STAT_BAR_WIDTH, "XP(" + player.xpLevel + ")", player.destructible.xp,
                player.getNextLevelXp(), Constants.XP_BAR_BACKGROUND, Constants.XP_BAR_FOREGROUND);
            this.renderConditions(player.ai.conditions);
            this.renderMessages();
            super.onRender(destination);
        }

        onUpdate(time: number) {
            this.handleMouseMove();
        }

        clear() {
            this.messages = [];
            this.mouseLookText = "";
        }

        private renderConditions(conditions: Condition[]) {
            if (!conditions) {
                return;
            }
            for (var i: number = 0, len: number = conditions.length; i < len && i < 4; ++i) {
                var cond: Condition = conditions[i];
                this.renderBar(1, 3 + i, Constants.STAT_BAR_WIDTH, cond.getName(),
                    cond.time, cond.initialTime, Constants.CONDITION_BAR_BACKGROUND,
                    Constants.CONDITION_BAR_FOREGROUND, false);
            }
        }

        private handleMouseLook(actors: Actor[], pos: Core.Position) {
            var len: number = actors.length;
            this.mouseLookText = "";
            if (Yendor.urlParams[Constants.URL_PARAM_DEBUG]) {
                this.mouseLookText = "topo:" + Engine.instance.topologyMap.getObjectId(pos) + "|";
            }

            for (var i: number = 0; i < len; ++i) {
                var actor: Actor = actors[i];
                if (Engine.instance.map.shouldRenderActor(actor)) {
                    if (i > 0) {
                        this.mouseLookText += ",";
                    }
                    this.mouseLookText += actor.getDescription();
                }
            }
        }

        private renderMessages() {
            for (var i: number = 0; i < this.messages.length; ++i) {
                var msg: Message = this.messages[i];
                this.console.print(StatusPanel.MESSAGE_X, i + 1, msg.text, msg.color);
            }
        }

        private renderBar(x: number, y: number, width: number, name: string, value: number,
            maxValue: number, foreColor: Core.Color, backColor: Core.Color, displayValues: boolean = true) {
            this.console.clearBack(backColor, x, y, width, 1);
            var barWidth = Math.floor(value / maxValue * width);
            if (barWidth > 0) {
                this.console.clearBack(foreColor, x, y, barWidth, 1);
            }
            var label: string = name;
            if (displayValues && maxValue !== -1) {
                label += " : " + Math.floor(value) + "/" + Math.floor(maxValue);
            }
            this.console.print(x + Math.floor((width - label.length) / 2), y, label);
        }
    }

	/********************************************************************************
	 * Group: inventory
	 ********************************************************************************/
    export interface ItemListener {
        (item: Actor): void;
    }
    export interface OpenInventoryEventData {
        title: string;
        itemListener: ItemListener;
    }

    export class InventoryPanel extends Gizmo.ConsoleWidget implements Umbra.EventListener {
        private title: string = "=== inventory - ESC to close ===";
        private selectedItem: number;
        private itemListener: ItemListener;
        enableEvents: boolean = true;
		/*
			Property: inventory
			Stacked list of items
		*/
        private inventory: Actor[][];

        constructor(width: number, height: number) {
            super(width, height);
            this.setModal();
            this.hide();
            this.showOnEventType(EventType[EventType.OPEN_INVENTORY], function(data: OpenInventoryEventData) {
                this.itemListener = data.itemListener;
                this.title = "=== " + data.title + " - ESC to close ===";
            }.bind(this));
        }

        checkKeyboardInput() {
            if (Umbra.Input.wasButtonPressed(PlayerAction[PlayerAction.CANCEL])) {
                this.hide();
                Umbra.Input.resetInput();
            } else {
                for (var keyCode: number = Umbra.KeyCode.DOM_VK_A; keyCode <= Umbra.KeyCode.DOM_VK_Z; ++keyCode) {
                    if (Umbra.Input.wasKeyPressed(keyCode)) {
                        var item: Actor = this.getByShortcut(keyCode - Umbra.KeyCode.DOM_VK_A);
                        if (item) {
                            this.selectItem(item);
                            break;
                        }
                    }
                }
            }
        }

        handleMouseMove() {
            if (Umbra.Input.wasMouseMoved()) {
                this.selectItemAtPos(Umbra.Input.getMouseCellPosition());
            }
        }

        private selectItemByIndex(index: number) {
            if (index >= 0 && index < this.inventory.length) {
                var item: Actor = this.inventory[index][0];
                this.selectItem(item);
            }
        }

        private selectItem(item: Actor) {
            this.hide();
            this.itemListener(item);
        }

        show() {
            super.show();
            var player: Actor = Engine.instance.actorManager.getPlayer();
            this.buildStackedInventory(player.container);
        }

        hide() {
            super.hide();
        }

        private selectItemAtPos(pos: Core.Position) {
            this.selectedItem = pos.y - (this.boundingBox.y + 1);
        }

        onRender(destination: Yendor.Console) {
            this.console.clearBack(Constants.INVENTORY_BACKGROUND);
            this.console.clearText();
            this.boundingBox.x = Math.floor(destination.width / 2 - this.boundingBox.w / 2);
            this.boundingBox.y = Math.floor(destination.height / 2 - this.boundingBox.h / 2);
            var y: number = 1;
            this.console.print(Math.floor(this.boundingBox.w / 2 - this.title.length / 2), 0, this.title);
            var player: Actor = Engine.instance.actorManager.getPlayer();
            this.handleMouseMove();
            for (var i: number = 0; i < this.inventory.length; i++) {
                var list: Actor[] = this.inventory[i];
                this.renderItem(list[0], i, y, list.length);
                y++;
            }
            var capacity: string = "capacity " + (Math.floor(10 * player.container.computeTotalWeight()) / 10)
                + "/" + player.container.capacity;
            this.console.print(Math.floor(this.boundingBox.w / 2 - capacity.length / 2), this.boundingBox.h - 1, capacity);
            super.onRender(destination);
        }
        
        onUpdate(time: number) {
            this.checkKeyboardInput();
            if (this.selectedItem !== undefined && Umbra.Input.wasMouseButtonReleased(Umbra.MouseButton.LEFT)) {
                this.selectItemByIndex(this.selectedItem);
                Umbra.Input.resetInput();
            }            
        }

        private renderItem(item: Actor, entryNum: number, y: number, count: number = 1) {
            var itemDescription = "(" + String.fromCharCode(item.pickable.shortcut + "a".charCodeAt(0)) + ") " + item.ch + " ";
            if (count > 1) {
                itemDescription += count + " ";
            }
            itemDescription += item.getDescription();

            this.console.print(2, y, itemDescription, Constants.INVENTORY_FOREGROUND);
            if (entryNum === this.selectedItem) {
                this.console.clearBack(Constants.INVENTORY_BACKGROUND_ACTIVE, 0, y, -1, 1);
                this.console.clearFore(Constants.INVENTORY_FOREGROUND_ACTIVE, 0, y, -1, 1);
            }
            if (item.equipment && item.equipment.isEquipped()) {
                this.console.clearBack(Constants.INVENTORY_BACKGROUND_EQUIPPED, 5, y, 3, 1);
            }
            this.console.fore[6][y] = item.col;
        }

        private getByShortcut(shortcut: number): Actor {
            for (var i: number = 0; i < this.inventory.length; i++) {
                var list: Actor[] = this.inventory[i];
                if (list[0].pickable.shortcut === shortcut) {
                    return list[0];
                }
            }
            return undefined;
        }

        /*
              Function: getFreeShortcut

              Returns:
              the first available shortcut
        */
        private getFreeShortcut(): number {
            var shortcut: number = 0;
            var available: boolean = true;
            do {
                available = (this.getByShortcut(shortcut) === undefined);
                if (!available) {
                    shortcut++;
                }
            } while (!available);
            return shortcut;
        }

        private buildStackedInventory(container: Container) {
            var player: Actor = Engine.instance.actorManager.getPlayer();
            this.inventory = [];
            for (var i: number = 0; i < player.container.size(); ++i) {
                var item: Actor = player.container.get(i);
                var found: boolean = false;
                if (item.isStackable()) {
                    for (var j: number = 0; j < this.inventory.length; ++j) {
                        if (this.inventory[j][0].isStackable() && this.inventory[j][0].name === item.name) {
                            item.pickable.shortcut = this.inventory[j][0].pickable.shortcut;
                            this.inventory[j].push(item);
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    var itemTab: Actor[] = [];
                    itemTab.push(item);
                    this.inventory.push(itemTab);
                }
            }
            this.inventory.sort(function(a: Actor[], b: Actor[]) { return a[0].name.localeCompare(b[0].name); });
            this.defineShortcuts();
        }

        private defineShortcuts() {
            for (var i: number = 0; i < this.inventory.length; i++) {
                var list: Actor[] = this.inventory[i];
                if (list[0].pickable.shortcut === undefined) {
                    list[0].pickable.shortcut = this.getFreeShortcut();
                }
            }
        }
    }

	/********************************************************************************
	 * Group: tilePicker
	 ********************************************************************************/

    export interface TilePickerEventData {
        origin?: Core.Position;
        // maximum distance from origin
        range?: number;
        // display some blast radius indicator around selected position
        radius?: number;
    }
	/*
		Class: TilePicker
		A background Gui that sleeps until it receives a PICK_TILE event containing a TilePickerListener.
		It then listens to mouse events until the player left-clicks a tile.
		Then it sends a TILE_SELECTED event containing the tile position.
	*/
    export class TilePicker extends Gizmo.Widget implements Umbra.EventListener {
        private tilePos: Core.Position = new Core.Position();
        private tileIsValid: boolean = false;
        private data: TilePickerEventData;
        enableEvents: boolean = true;
        constructor() {
            super();
            this.hide();
            this.setModal();
            this.showOnEventType(EventType[EventType.PICK_TILE], function(data: TilePickerEventData) {
                this.data = data;
                this.tileIsValid = true;
                var player: Actor = Engine.instance.actorManager.getPlayer();
                this.tilePos.x = player.x;
                this.tilePos.y = player.y;
            }.bind(this));
        }

        onRender(console: Yendor.Console) {
            this.handleMouseMove();
            this.handleMouseClick();
            this.checkKeyboardInput();
            if (console.contains(this.tilePos)) {
                console.text[this.tilePos.x][this.tilePos.y] = this.tileIsValid ? "+".charCodeAt(0) : "x".charCodeAt(0);
                console.fore[this.tilePos.x][this.tilePos.y] = this.tileIsValid ? Constants.TILEPICKER_OK_COLOR : Constants.TILEPICKER_KO_COLOR;
            }
            var hasRange: boolean = (this.data && this.data.range && this.data.origin) ? true : false;
            var hasRadius: boolean = (this.data && this.data.radius) ? true : false;
            if (hasRange || hasRadius) {
                // render the range and/or radius
                var pos: Core.Position = new Core.Position();
                for (pos.x = 0; pos.x < Engine.instance.map.width; ++pos.x) {
                    for (pos.y = 0; pos.y < Engine.instance.map.height; ++pos.y) {
                        var atRange: boolean = hasRange ? Core.Position.distance(this.data.origin, pos) <= this.data.range : true;
                        var inRadius: boolean = this.tileIsValid && hasRadius ? Core.Position.distance(this.tilePos, pos) <= this.data.radius : false;
                        var coef = inRadius ? 1.2 : atRange ? 1 : 0.8;
                        if (coef !== 1) {
                            console.back[pos.x][pos.y] = Core.ColorUtils.multiply(console.back[pos.x][pos.y], coef);
                            console.fore[pos.x][pos.y] = Core.ColorUtils.multiply(console.fore[pos.x][pos.y], coef);
                        }
                    }
                }
            }
        }

        onUpdate(time: number): void {
            if (getLastPlayerAction() === PlayerAction.CANCEL) {
                this.hide();
                Umbra.Input.resetInput();
            }
        }

        checkKeyboardInput() {
            var action: PlayerAction = getLastPlayerAction();
            var move: Core.Position = convertActionToPosition(action);
            if (move.y === -1 && this.tilePos.y > 0) {
                this.tilePos.y--;
            } else if (move.y === 1 && this.tilePos.y < Engine.instance.map.height - 1) {
                this.tilePos.y++;
            }
            if (move.x === -1 && this.tilePos.x > 0) {
                this.tilePos.x--;
            } else if (move.x === 1 && this.tilePos.x < Engine.instance.map.width - 1) {
                this.tilePos.x++;
            }
            switch (action) {
                case PlayerAction.CANCEL:
                    this.hide();
                    Umbra.Input.resetInput();
                    break;
                case PlayerAction.VALIDATE:
                    if (this.tileIsValid) {
                        this.doSelectTile(this.tilePos);
                        this.hide();
                        Umbra.Input.resetInput();
                    }
                    break;
            }
            this.tileIsValid = this.checkTileValidity();
        }

        handleMouseClick() {
            if (Umbra.Input.wasMouseButtonReleased(Umbra.MouseButton.LEFT)) {
                if (this.tileIsValid) {
                    this.doSelectTile(this.tilePos);
                    this.hide();
                }
            } else if (Umbra.Input.wasMouseButtonReleased(Umbra.MouseButton.RIGHT)) {
                this.hide();
            }
        }

        handleMouseMove() {
            if (Umbra.Input.wasMouseMoved()) {
                var mouseCellPos: Core.Position = Umbra.Input.getMouseCellPosition();
                this.tilePos.x = mouseCellPos.x;
                this.tilePos.y = mouseCellPos.y;
                this.tileIsValid = this.checkTileValidity();
            }
        }

        private checkTileValidity(): boolean {
            if (!Engine.instance.map.isInFov(this.tilePos.x, this.tilePos.y)) {
                return false;
            }
            if (this.data && this.data.origin && this.data.range
                && Core.Position.distance(this.data.origin, this.tilePos) > this.data.range) {
                return false;
            }
            return true;
        }

        private doSelectTile(pos: Core.Position) {
            Umbra.EventManager.publishEvent(EventType[EventType.TILE_SELECTED], pos);
        }
    }

	/********************************************************************************
	 * Group: menu
	 ********************************************************************************/
    interface MenuItem {
        label: string,
        eventType: string
    }
    export abstract class PopupMenu extends Gizmo.Widget implements Umbra.EventListener {
        private items: MenuItem[] = [];
        constructor() {
            super();
            this.hide();
            this.setModal();
            this.boundingBox = new Core.Rect(0, 0, 0, 2);
        }

        protected addItem(label: string, eventType: string) {
            this.boundingBox.h++;
            this.boundingBox.w = Math.max(label.length + 2, this.boundingBox.w);
            this.boundingBox.x = Math.floor(Constants.CONSOLE_WIDTH / 2 - this.boundingBox.w / 2);
            this.boundingBox.y = Math.floor(Constants.CONSOLE_HEIGHT / 2 - this.boundingBox.h / 2);
            this.items.push({ label: label, eventType: eventType });
        }
        onRender(con: Yendor.Console): void {
            Gizmo.frame(con, this.boundingBox.x, this.boundingBox.y, 13, 4);
            for (var i: number = 0, len: number = this.items.length; i < len; ++i) {
                Gizmo.button(this, con, this.boundingBox.x, this.boundingBox.y + 1 + i, this.items[i].eventType, this.items[i].label, { autoHide: true });
            }
        }
        onUpdate(time: number): void {
            if (getLastPlayerAction() === PlayerAction.CANCEL) {
                this.hide();
                Umbra.Input.resetInput();
            }
        }
    }

    export class MainMenu extends PopupMenu {
        constructor() {
            super();
            this.showOnEventType(EventType[EventType.OPEN_MAIN_MENU]);
            this.addItem(" Resume game ", EventType[EventType.RESUME_GAME]);
            this.addItem("   New game  ", EventType[EventType.NEW_GAME]);
        }
    }
}
