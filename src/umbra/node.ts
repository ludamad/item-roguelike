/*
	Section: Scene nodes
*/
module Umbra {
    "use strict";

    export abstract class Node extends Core.TreeNode {
        protected boundingBox: Core.Rect;

        private visible: boolean = true;
        private zOrder: number;
        private sortNeeded: boolean = false;

        show() {
            this.visible = true;
        }
        hide() {
            this.visible = false;
        }
        isVisible(): boolean {
            return this.visible;
        }

        getBoundingBox(): Core.Rect {
            return this.boundingBox;
        }

        moveTo(pos: Core.Position);
        moveTo(x: number, y: number);
        moveTo(x: number | Core.Position, y?: number) {
            if (typeof x === "number") {
                this.boundingBox.moveTo(x, y);
            } else {
                var pos: Core.Position = <Core.Position>x;
                this.boundingBox.moveTo(pos.x, pos.y);
            }
        }

        resize(w: number, h: number) {
            this.boundingBox.resize(w, h);
        }

        getZOrder(): number {
            return this.zOrder;
        }

        setZOrder(value: number) {
            if (this.zOrder !== value) {
                this.zOrder = value;
                if (this.parent) {
                    (<Node>this.parent).sort(this);
                }
            }
        }

        computeAbsoluteCoordinates(pos: Core.Position): void {
            if (this.parent) {
                (<Node>this.parent).computeAbsoluteCoordinates(pos);
            }
            if (this.boundingBox) {
                pos.x += this.boundingBox.x;
                pos.y += this.boundingBox.y;
            }
        }

        onInit(): void {}
        onTerm(): void {}
        abstract onRender(con: Yendor.Console): void;
        abstract onUpdate(time: number): void;

		/*
			Function: sort
			One child needs to be sorted because its zOrder value changed
			
			Parameters:
			child - the child to sort
		*/
        protected sort(child: Node) {
            var index: number = 0;
            var len: number = this.children.length;
            while (index != len && this.children[index] !== child) {
                ++index;
            }
            while (index > 0 && (<Node>this.children[index - 1]).zOrder > child.zOrder) {
                this.children[index] = this.children[index - 1];
                this.children[index - 1] = child;
                --index;
            }
            while (index < len && (<Node>this.children[index + 1]).zOrder < child.zOrder) {
                this.children[index] = this.children[index + 1];
                this.children[index + 1] = child;
                ++index;
            }
        }

		/*
			Function: renderHierarchy
			Render this node, then this node children in ascending zOrder.

			Parameters:
			con - the console to render on
		*/
        renderHierarchy(con: Yendor.Console): void {
            if (this.visible) {
                this.onRender(con);
                for (var i: number = 0, len: number = this.children.length; i < len; ++i) {
                    var node: Node = <Node>this.children[i];
                    node.renderHierarchy(con);
                }
            }
        }

		/*
			Function: updateHierarchy
			Update this node children in descending zOrder, then this node.

			Parameters:
			time - current game time
		*/
        updateHierarchy(time: number): void {
            if (this.visible) {
                for (var i: number = this.children.length-1; i >= 0; --i) {
                    var node: Node = <Node>this.children[i];
                    node.updateHierarchy(time);
                }
                this.onUpdate(time);
            }
        }

		/*
			Function: addChild
			Add a child keeping children sorted in zOrder.

			Parameters:
			node - the child node
            
            Returns:
            the position of the node in the child list
		*/
        addChild(node: Node): number {
            var i: number = 0, len: number = this.children.length;
            while (i < len && (<Node>this.children[i]).zOrder < node.zOrder) {
                ++i;
            }
            if (i === len) {
                this.children.push(node);
            } else {
                this.children.splice(i, 0, node);
            }
            return i;
        }
        
        computeBoundingBox() {
            if (this.children.length === 0) {
                return;
            }
            var first: boolean = true;
            for (var i: number = 0, len: number = this.children.length; i < len; ++i) {
                var node: Node = <Node>this.children[i];
                if (node.boundingBox) {
                    if ( first ) {
                        if (! this.boundingBox ) {
                            this.boundingBox = new Core.Rect();
                        }
                        this.boundingBox.set(node.boundingBox);
                        first = false;
                    } else {
                        // make sure our bounding box contains all the children.
                        var p: Core.Position = new Core.Position(node.boundingBox.x, node.boundingBox.y);
                        this.boundingBox.expand(p);
                        p.x += node.boundingBox.w - 1;
                        p.y += node.boundingBox.h - 1;
                        this.boundingBox.expand(p);
                    }
                }
            }
        }
    }

}
