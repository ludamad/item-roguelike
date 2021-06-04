/**
 * Section: GUI
 */
import * as Yendor from "./yendor/main";
import * as Gui from "./gui/main";
import * as Actors from "./actors/main";
import { SlotContainerPanel, MultiSlotContainerPanel } from "./gui_inventory";
import { NumberSelector } from "./gui_input_number";
import * as Umbra from "./umbra/main";
import { isArray } from "jquery";

/**
 * =============================================================================
 * Group: inventory
 * =============================================================================
 */
export class LootPanel extends Gui.Widget implements Actors.ILootHandler {
  private looter: Actors.Actor;
  private looted: Actors.Actor[] | Actors.Actor;
  private looterPanel: SlotContainerPanel;
  private lootedPanel: MultiSlotContainerPanel;

  constructor(private numberSelector: NumberSelector) {
    super();
    this.setModal();
  }

  public onInit() {
    super.onInit();
    this.hide();

    let popup: Gui.Popup = this.addChild(
      new Gui.Popup({ cancelAction: this.onCancel.bind(this) })
    );
    let hpanel: Gui.HPanel = popup.addChild(new Gui.HPanel({}));
    this.looterPanel = hpanel.addChild(
      new SlotContainerPanel(this.numberSelector, {
        leftButton: {
          label: "Close",
          autoHideWidget: this,
        },
      })
    );
    this.lootedPanel = hpanel.addChild(
      new MultiSlotContainerPanel(this.numberSelector, {
        rightButton: {
          label: "Take all",
          callback: this.takeAll.bind(this),
        },
      })
    );
  }

  private hasLoot(looted: Actors.Actor[]) {
    for (const loot of looted) {
      // hack: use weight
      if (loot.container.computeTotalWeight() > 0) {
        return true;
      }
      return false;
    }
  }

  public lootContainer(
    looter: Actors.Actor,
    looted: Actors.Actor[] | Actors.Actor
  ) {
    if (
      !this.hasLoot(
        isArray(looted) ? (looted as Actors.Actor[]) : [looted as Actors.Actor]
      )
    ) {
      Umbra.logger.warn("There's nothing to loot!");
      return;
    }
    this.looter = looter;
    this.looted = looted;
    this.looterPanel.initForCreature(
      looter,
      this.onSelectLooterItem.bind(this)
    );
    this.lootedPanel.initForCreatures(
      looted,
      this.onSelectLootedItem.bind(this)
    );
    this.show();
  }

  public onRender(_destination: Yendor.Console) {
    this.center();
  }

  private takeAll(_data: any): boolean {
    let looted: Actors.Actor = this.lootedPanel.getCurrentContainer();
    while (looted.container.size() > 0) {
      let actor: Actors.Actor = looted.container.get(0)!;
      if (!actor.pickable.pick(actor, this.looter, true)) {
        return true;
      }
    }
    return true;
  }

  private onSelectLooterItem(item: Actors.Actor) {
    item.pickable.pick(item, this.lootedPanel.getCurrentContainer(), true);
  }

  private onSelectLootedItem(item: Actors.Actor) {
    item.pickable.pick(item, this.looter, true);
  }

  private onCancel(): boolean {
    Gui.Draggable.resetDrag();
    return true;
  }
}
