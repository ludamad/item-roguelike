/**
 * Section: Binary space partition tree
 */
import * as Core from "../core/main";
import * as rng from "./rng";
/**
 * Enum: BSPTraversalAction
 * Value returned by the callback during a tree traversal.
 * CONTINUE - continue the traversal to the next node.
 * STOP - stop the traversal at this node.
 */
export const enum BSPTraversalAction { CONTINUE, STOP }

/**
 * Class: BSPNode
 * A binary space partition toolkit, making it easy to build, split and traverse a BSP tree.
 */
export class BSPNode extends Core.Rect {
    public splitPos: number = 0;
    public horiz: boolean = true;
    public level: number = 0;
    public parent: BSPNode|undefined;
    public leftChild: BSPNode|undefined;
    public rightChild: BSPNode|undefined;
    public userData: any;

    /**
     * Constructor: constructor
     * Parameters:
     * x - left coordinate of the node region.
     * y - top coordinate of the node region.
     * w - the node region's width
     * h - the node region's height
     */
    constructor(x: number, y: number, w: number, h: number, level?: number, parent?: BSPNode) {
        super(x, y, w, h);
        this.level = level || 0;
        this.parent = parent;
    }

    /**
     * Group: inspecting the tree
     * Function: isLeaf
     * Returns:
     * true is this node is a leaf (has no children).
     */
    public isLeaf(): boolean {
        return (!this.leftChild);
    }

    /**
     * Function: findNode
     * Find the smallest node in the tree containing a point.
     * Parameters:
     * px - the point x coordinate.
     * py - the point y coordinate.
     * Returns:
     * the smallest BSPNode in the hierarchy that contains the point, or *undefined* if the point is outside the tree.
     */
    public findNode(px: number, py: number): BSPNode|undefined {
        if (this.contains(px, py)) {
            if (this.leftChild && this.leftChild.contains(px, py)) {
                return this.leftChild.findNode(px, py);
            }
            if (this.rightChild && this.rightChild.contains(px, py)) {
                return this.rightChild.findNode(px, py);
            }
            return this;
        }
        return undefined;
    }

    /**
     * Group: building the tree
     * Function: clear
     * Remove this node's children, turning it into a leaf.
     */
    public clear() {
        this.leftChild = undefined;
        this.rightChild = undefined;
        this.splitPos = 0;
        this.horiz = true;
    }

    /**
     * Function: split
     * Split this node into two sub-nodes, either horizontally (the left child is on top of the right child)
     * or vertically (the left child is left to the right child).
     * Parameters:
     * horiz - whether to split horizontally or vertically.
     * splitPos - coordinate of the frontier.
     */
    public split(horiz: boolean, splitPos: number) {
        this.horiz = horiz;
        this.splitPos = splitPos;
        if (horiz) {
            this.leftChild = new BSPNode(this.x, this.y, this.splitPos, this.h, this.level + 1, this);
            this.rightChild = new BSPNode(this.x + this.splitPos, this.y,
                this.w - this.splitPos, this.h, this.level + 1, this);
        } else {
            this.leftChild = new BSPNode(this.x, this.y, this.w, this.splitPos, this.level + 1, this);
            this.rightChild = new BSPNode(this.x, this.y + this.splitPos, this.w,
                this.h - this.splitPos, this.level + 1, this);
        }
    }

    /**
     * Function: splitRecursive
     * Recursively and randomly split this node and its children.
     * Parameters:
     * rng - random number generator to use or *undefined*.
     * count - number of levels of the generated tree.
     * minSize - *optional* don't split a node if the resulting child's
     *     region has a width or height smaller than minSize.
     * maxHVRatio - *optional* don't split a node if the resulting child width/height
     *     or height/width ratio is greater than maxHVRatio.
     */
    public splitRecursive(generator: rng.Random|undefined, count: number, minSize?: number, maxHVRatio?: number) {
        if (!generator) {
            generator = rng.CMWCRandom.default;
        }
        let horiz: boolean = false;
        if (!minSize) {
            minSize = 0;
        } else {
            if (this.w < 2 * minSize || this.h < 2 * minSize) {
                return;
            } else if (this.w < 2 * minSize) {
                horiz = false;
            } else if (this.h < 2 * minSize) {
                horiz = true;
            }
        }
        if (!horiz) {
            horiz = generator.getNumber(0, 1) === 0 ? false : true;
        }
        let splitPos: number = horiz ?
            generator.getNumber(minSize, this.w - minSize)
            : generator.getNumber(minSize, this.h - minSize);
        this.split(horiz, splitPos);
        if (count > 1 && this.leftChild && this.rightChild) {
            this.leftChild.splitRecursive(generator, count - 1, minSize, maxHVRatio);
            this.rightChild.splitRecursive(generator, count - 1, minSize, maxHVRatio);
        }
    }

    /**
     * Group: traversing the tree
     */

    /**
     * Function: traversePreOrder
     * Traverse the tree in pre-order (node, left child, right child).
     * Parameters:
     * callback - a function called when visiting a node.
     * userData - *optional* some user data sent to the callback.
     */
    public traversePreOrder(callback: (node: BSPNode, userData: any) => BSPTraversalAction,
                            userData?: any): BSPTraversalAction {
        if (callback(this, userData) === BSPTraversalAction.STOP) {
            return BSPTraversalAction.STOP;
        }
        if (this.leftChild) {
            if (this.leftChild.traversePreOrder(callback, userData) === BSPTraversalAction.STOP) {
                return BSPTraversalAction.STOP;
            }
            if (this.rightChild && this.rightChild.traversePreOrder(callback, userData) === BSPTraversalAction.STOP) {
                return BSPTraversalAction.STOP;
            }
        }
        return BSPTraversalAction.CONTINUE;
    }

    /**
     * Function: traverseInOrder
     * Traverse the tree in in-order (left child, node, right child).
     * Parameters:
     * callback - a function called when visiting a node.
     * userData - *optional* some user data sent to the callback.
     */
    public traverseInOrder(callback: (node: BSPNode, userData: any) => BSPTraversalAction,
                           userData?: any): BSPTraversalAction {
        if (this.leftChild && this.leftChild.traverseInOrder(callback, userData) === BSPTraversalAction.STOP) {
            return BSPTraversalAction.STOP;
        }
        if (callback(this, userData) === BSPTraversalAction.STOP) {
            return BSPTraversalAction.STOP;
        }
        if (this.rightChild) {
            return this.rightChild.traverseInOrder(callback, userData);
        }
        return BSPTraversalAction.CONTINUE;
    }

    /**
     * Function: traversePostOrder
     * Traverse the tree in post-order (left child, right child, node).
     * Parameters:
     * callback - a function called when visiting a node.
     * userData - *optional* some user data sent to the callback.
     */
    public traversePostOrder(callback: (node: BSPNode, userData: any) => BSPTraversalAction,
                             userData?: any): BSPTraversalAction {
        if (this.leftChild) {
            if (this.leftChild.traversePostOrder(callback, userData) === BSPTraversalAction.STOP) {
                return BSPTraversalAction.STOP;
            }
            if (this.rightChild && this.rightChild.traversePostOrder(callback, userData) === BSPTraversalAction.STOP) {
                return BSPTraversalAction.STOP;
            }
        }
        return callback(this, userData);
    }

    /**
     * Function: traverseLevelOrder
     * Traverse the tree level by level (root, then root children, then level 2 children and so on).
     * Parameters:
     * callback - a function called when visiting a node.
     * userData - *optional* some user data sent to the callback.
     */
    public traverseLevelOrder(callback: (node: BSPNode, userData: any) => BSPTraversalAction,
                              userData?: any): BSPTraversalAction {
        for (let node of this.buildLevelTraversalNodeArray()) {
            if (callback(node, userData) === BSPTraversalAction.STOP) {
                return BSPTraversalAction.STOP;
            }
        }
        return BSPTraversalAction.CONTINUE;
    }

    /**
     * Function: traverseInvertedLevelOrder
     * Traverse the tree level by level, starting with the lowest levels (lowest leafs, up to the root).
     * Parameters:
     * callback - a function called when visiting a node.
     * userData - *optional* some user data sent to the callback.
     */
    public traverseInvertedLevelOrder(callback: (node: BSPNode, userData: any) => BSPTraversalAction,
                                      userData?: any): BSPTraversalAction {
        let nodes: BSPNode[] = this.buildLevelTraversalNodeArray();
        let nbNodes = nodes.length;
        for (let i = nbNodes - 1; i >= 0; i--) {
            let node: BSPNode = nodes[i];
            if (callback(node, userData) === BSPTraversalAction.STOP) {
                return BSPTraversalAction.STOP;
            }
        }
        return BSPTraversalAction.CONTINUE;
    }

    private buildLevelTraversalNodeArray(): BSPNode[] {
        let nodesToTraverse: BSPNode[] = [];
        let nodes: BSPNode[] = [];
        nodes.push(this);
        while (nodes.length > 0) {
            let node: BSPNode|undefined = nodes.shift();
            if ( node ) {
                nodesToTraverse.push(node);
                if (node.leftChild) {
                    nodes.push(node.leftChild);
                    if (node.rightChild) {
                        nodes.push(node.rightChild);
                    }
                }
            }
        }
        return nodesToTraverse;
    }
}
