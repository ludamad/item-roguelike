/*
	Section: actors
*/
module Game {
	"use strict";
	/********************************************************************************
	 * Group: classes, types and factory
	 ********************************************************************************/

	/*
		class: ActorClass
		This stores a class hierarchy for all actors in the game.
		ActorClass.getRoot() is the root class that encompasses all actors.
		Current class hierarchy is :
		> root
		>    creature
		>        beast
		>        human
		>    potion
		>    scroll
		>    weapon
		>        blade
		>        shield
		>        ranged
		>        staff
		>        projectile
		>        	arrow
		>        	bolt
	*/
	export class ActorClass implements Persistent {
		className: string;
		_name: string;
		father: ActorClass;
		private static actorTypes: ActorClass[] = [];
		private static rootClass: ActorClass = new ActorClass("root");
		/*
			constructor
			To be used internally only. Typescript does not allow private constructors yet. Classes must be built using <buildClassHierarchy>.
		*/
		constructor(name: string, father?: ActorClass) {
			this.className = "ActorClass";
			this._name = name;
			this.father = father ? father : ActorClass.rootClass;
			ActorClass.actorTypes.push(this);
		}

		get name() { return this._name; }

		static getRoot(): ActorClass {
			return ActorClass.rootClass;
		}

		/*
			Function: getActorClass
			Returns: the ActorClass with given name or undefined if unknown
		*/
		static getActorClass(name: string): ActorClass {
			var n: number = ActorClass.actorTypes.length;
			for ( var i = 0; i < n; ++i ) {
				if ( ActorClass.actorTypes[i]._name === name ) {
					return ActorClass.actorTypes[i];
				}
			}
			return undefined;
		}

		/*
			Function: buildClassHierarchy
			Create a hierarchy of actor classes and return the last class.
			For example buildClassHierarchy("weapon|blade|sword") will return a "sword" actor class, 
			creating every class in the hierarchy that doesn't exist yet.

			Parameters:
				classes - list of class names separated with a pipe "|"
			Returns:
				the last class of the list, creating missing classes in the hierarchy
		*/
		static buildClassHierarchy(classes: string): ActorClass {
			var classArray: string[] = classes.split("|");
			var n: number = classArray.length;
			var currentClass: ActorClass = ActorClass.rootClass;
			for ( var i = 0; i < n; ++i ) {
				var newClass = ActorClass.getActorClass(classArray[i]);
				if (!newClass) {
					newClass = new ActorClass(classArray[i], currentClass);
				}
				currentClass = newClass;
			}
			return currentClass;
		}

		/*
			Function: isA
			Return true if this is a type
		*/
		isA(type: ActorClass): boolean {
			if ( this._name === type._name ) {
				return true;
			}
			if ( ! this.father || this.father._name === ActorClass.rootClass._name ) {
				return false;
			}
			return this.father.isA(type);
		}
	}

	/*
		Enum: ActorType
		enum for all the actors existing in the game.
	*/
	export enum ActorType {
		// creature
		// 		beast
		GOBLIN,
		ORC,
		TROLL,
		// 		human
		PLAYER,
		// potion
		HEALTH_POTION,
		REGENERATION_POTION,
		// scroll
		LIGHTNING_BOLT_SCROLL,
		FIREBALL_SCROLL,
		CONFUSION_SCROLL,
		// weapon
		// 		blades
		SHORT_SWORD,
		LONG_SWORD,
		GREAT_SWORD,
		// 		shield
		WOODEN_SHIELD,
		IRON_SHIELD,
		// 		ranged
		SHORT_BOW,
		LONG_BOW,
		CROSSBOW,
		// 		staffs, wands and rods
		FROST_WAND,
		// 		projectile
		// 			arrow	
		BONE_ARROW,
		IRON_ARROW,
		// 			bolt
		BOLT,
		// miscellaneous (under root class)
		STAIR_UP,
		STAIR_DOWN,
		LAST_ACTOR_TYPE
	};

	interface BeastParam {
		hp: number;
		attack: number;
		defense: number;
		xp: number;
		walkTime: number;
	}

	interface BladeParam {
		damages: number;
		attackTime: number;
		twoHanded: boolean;
		weight: number;
	}

	interface RangedParam {
		damages: number;
		projectileTypeName: string;
		loadTime: number;
		twoHanded: boolean;
	}

	interface StaffParam {
		maxCharges: number;
		fireEffect?: Effect;
		fireTargetSelectionMethod: TargetSelectionMethod;
		fireMessage: string;
		weight: number;
		twoHanded: boolean;
		// for condition staffs
		condType?: ConditionType;
		additionalArgs?: any[];
		condMessage?: string;
		nbTurns?: number;
	}

	interface InstantHealthPotionParam {
		amount: number;
		targetSelectionMethod: TargetSelectionMethod;
		useMessage: string;
		useFailMessage: string;
		throwMessage: string;
		throwFailMessage: string;
	}

	/*
		Class: ActorFactory
		Built an actor.
	*/
	export class ActorFactory {
		private static builders: { [index: string]: (x: number, y: number) => Actor } = {
			// creature
			// 		beast
			GOBLIN: (x: number, y: number) => { return ActorFactory.createBeast(x, y, "g", "goblin", "goblin corpse", 0x3F7F3F,
				{ hp: 3, attack: 1, defense: 0, xp: 10, walkTime: 4 } ); },
			ORC: (x: number, y: number) => { return ActorFactory.createBeast(x, y, "o", "orc", "dead orc", 0x3F7F3F,
				{ hp: 9, attack: 2, defense: 0, xp: 35, walkTime: 5 } ); },
			TROLL: (x: number, y: number) => { return ActorFactory.createBeast(x, y, "T", "troll", "troll carcass", 0x007F00,
				{ hp: 15, attack: 3, defense: 1, xp: 100, walkTime: 6 } ); },
			// 		human
			PLAYER: (x: number, y: number) => { return ActorFactory.createPlayer(x, y); },
			// potion
			HEALTH_POTION: (x: number, y: number) => {
				return ActorFactory.createInstantHealthPotion(x, y, "health potion",
					{amount: 5, targetSelectionMethod: TargetSelectionMethod.ACTOR_ON_CELL,
					useMessage: "[The actor1] drink[s] the health potion and regain[s] [value1] hit points.",
					useFailMessage: "[The actor1] drink[s] the health potion but it has no effect",
					throwMessage: "The potion explodes on [the actor1], healing [it] for [value1] hit points.",
					throwFailMessage: "The potion explodes on [the actor1] but it has no effect" });
			},
			REGENERATION_POTION: (x: number, y: number) => {
				return	ActorFactory.createConditionPotion(x, y, "regeneration potion", 20, [10],
					ConditionType.REGENERATION, TargetSelectionMethod.ACTOR_ON_CELL,
					"[The actor1] drink[s] the regeneration potion and feel[s]\nthe life flowing through [it].",
					"The potion explodes on [the actor1].\nLife is flowing through [it].");
			},
			// scroll
			LIGHTNING_BOLT_SCROLL: (x: number, y: number) => { return ActorFactory.createLightningBoltScroll(x, y, 5, 20); },
			FIREBALL_SCROLL: (x: number, y: number) => { return ActorFactory.createFireballScroll(x, y, 3, 12); },
			CONFUSION_SCROLL: (x: number, y: number) => { return ActorFactory.createConfusionScroll(x, y, 5, 12); },
			// weapon
			// 		blade
			SHORT_SWORD: (x: number, y: number) => { return ActorFactory.createBlade(x, y, "short sword",
				{ damages: 4, attackTime: 4, twoHanded: false, weight: 2 } ); },
			LONG_SWORD: (x: number, y: number) => { return ActorFactory.createBlade(x, y, "longsword",
				{ damages: 6, attackTime: 5, twoHanded: false, weight: 3 } ); },
			GREAT_SWORD: (x: number, y: number) => { return ActorFactory.createBlade(x, y, "greatsword",
				{ damages: 10, attackTime: 6, twoHanded: true, weight: 4 } ); },
			// 		shield
			WOODEN_SHIELD: (x: number, y: number) => { return ActorFactory.createShield(x, y, "wooden shield", 1); },
			IRON_SHIELD: (x: number, y: number) => { return ActorFactory.createShield(x, y, "iron shield", 2); },
			// 		ranged
			SHORT_BOW: (x: number, y: number) => { return ActorFactory.createRanged(x, y, "short bow",
				{ damages: 3, projectileTypeName: "arrow", loadTime: 4, twoHanded: true } ); },
			LONG_BOW: (x: number, y: number) => { return ActorFactory.createRanged(x, y, "long bow",
				{ damages: 6, projectileTypeName: "arrow", loadTime: 6, twoHanded: true } ); },
			CROSSBOW: (x: number, y: number) => { return ActorFactory.createRanged(x, y, "crossbow",
				{ damages: 4, projectileTypeName: "bolt", loadTime: 5, twoHanded: false } ); },
			//      staff
			FROST_WAND: (x: number, y: number) => { return ActorFactory.createConditionStaff(x, y, "wand of frost",
				{	maxCharges: 5, fireTargetSelectionMethod: TargetSelectionMethod.SELECTED_ACTOR,
					weight: 0.5, twoHanded: false, fireMessage: "[The actor1] zap[s] [its] wand of frost.",
					condType: ConditionType.FROZEN, nbTurns: 5, condMessage: "[The actor1] [is] covered with frost."
				} ); },
			// 		projectile
			// 			arrow
			BONE_ARROW: (x: number, y: number) => { return ActorFactory.createProjectile(x, y, "bone arrow", 1, "arrow"); },
			IRON_ARROW: (x: number, y: number) => { return ActorFactory.createProjectile(x, y, "iron arrow", 1.25, "arrow"); },
			// 			bolt
			BOLT: (x: number, y: number) => { return ActorFactory.createProjectile(x, y, "bolt", 1, "bolt"); },
			// miscellaneous (under root class)
			STAIR_UP: (x: number, y: number) => { return ActorFactory.createStairs(x, y, "<", "up"); },
			STAIR_DOWN: (x: number, y: number) => { return ActorFactory.createStairs(x, y, ">", "down"); }
		};
		/*
			Function: create
			Create an actor of given type

			Parameters:
			type - the <ActorType>
			x - the actor x coordinate (default 0)
			y - the actor y coordinate (default 0)
		*/
		static create(type: ActorType, x: number = 0, y: number = 0): Actor {
			var builder: (x: number, y: number) => Actor = ActorFactory.builders[ ActorType[type] ];
			var actor: Actor;
			if ( ! builder ) {
				log("ERROR : unknown actor type " + type, 0xFF0000);
			} else {
				actor = builder(x, y);
			}
			return actor;
		}

		// potions
		private static createEffectPotion(x: number, y: number, name: string, onUseEffector: Effector, onThrowEffector?: Effector): Actor {
			var effectPotion = new Actor();
			effectPotion.init(x, y, "!", name, "potion", 0x800080, true);
			effectPotion.pickable = new Pickable(0.5, true);
			if ( onUseEffector ) {
				effectPotion.pickable.setOnUseEffector(onUseEffector);
			}
			if (onThrowEffector) {
				effectPotion.pickable.setOnThrowEffector(onThrowEffector);
			}
			return effectPotion;
		}

		private static createConditionPotion(x: number, y: number, name: string, nbTurns: number, additionalArgs: any[],
			condType: ConditionType, targetSelectionMethod: TargetSelectionMethod,
			useMessage: string, throwMessage: string) {
			return ActorFactory.createEffectPotion(x, y, name,
				new Effector(new ConditionEffect(condType, nbTurns,
					useMessage, additionalArgs),
					new TargetSelector( targetSelectionMethod ), undefined, true),
				new Effector(new ConditionEffect(condType, nbTurns,
					throwMessage, additionalArgs),
					new TargetSelector( targetSelectionMethod ), undefined, true)
				);
		}

		private static createInstantHealthPotion(x: number, y: number, name: string, param: InstantHealthPotionParam): Actor {
			return ActorFactory.createEffectPotion(x, y, name,
				new Effector(new InstantHealthEffect(param.amount, param.useMessage, param.useFailMessage),
					new TargetSelector( param.targetSelectionMethod ), undefined, true),
				new Effector(new InstantHealthEffect(param.amount, param.throwMessage, param.throwFailMessage),
					new TargetSelector( param.targetSelectionMethod ), undefined, true)
				);
		}

		// scrolls
		private static createLightningBoltScroll(x: number, y: number, range: number, damages: number): Actor {
			var lightningBolt = new Actor();
			lightningBolt.init(x, y, "#", "scroll of lightning bolt", "scroll", 0xFFFF3F, true);
			lightningBolt.pickable = new Pickable(0.1);
			lightningBolt.pickable.setOnUseEffect(new InstantHealthEffect(-damages,
				"A lightning bolt strikes [the actor1] with a loud thunder!\nThe damage is [value1] hit points."),
				new TargetSelector( TargetSelectionMethod.CLOSEST_ENEMY, range), undefined, true);
			return lightningBolt;
		}

		private static createFireballScroll(x: number, y: number, range: number, damages: number): Actor {
			var fireball = new Actor();
			fireball.init(x, y, "#", "scroll of fireball", "scroll", 0xFFFF3F, true);
			fireball.pickable = new Pickable(0.1);
			fireball.pickable.setOnUseEffect(new InstantHealthEffect(-damages,
				"[The actor1] get[s] burned for [value1] hit points."),
				new TargetSelector( TargetSelectionMethod.SELECTED_RANGE, range),
				"A fireball explodes, burning everything within " + range + " tiles.", true);
			return fireball;
		}

		private static createConfusionScroll(x: number, y: number, range: number, nbTurns: number): Actor {
			var confusionScroll = new Actor();
			confusionScroll.init(x, y, "#", "scroll of confusion", "scroll", 0xFFFF3F, true);
			confusionScroll.pickable = new Pickable(0.1);
			confusionScroll.pickable.setOnUseEffect(new ConditionEffect(ConditionType.CONFUSED, nbTurns,
				"[The actor1's] eyes look vacant,\nas [it] start[s] to stumble around!"),
				new TargetSelector( TargetSelectionMethod.SELECTED_ACTOR, range), undefined, true);
			return confusionScroll;
		}

		// weapons
		private static createBlade(x: number, y: number, name: string, swordParam: BladeParam): Actor {
			var sword = new Actor();
			sword.init(x, y, "/", name, "weapon|blade", 0xF0F0F0, true);
			sword.pickable = new Pickable(swordParam.weight);
			sword.pickable.setOnThrowEffect(new InstantHealthEffect(-swordParam.damages,
				"The sword hits [the actor1] for [value1] hit points."),
				new TargetSelector( TargetSelectionMethod.ACTOR_ON_CELL ));
			sword.attacker = new Attacker(swordParam.damages, swordParam.attackTime);
			sword.equipment = new Equipment(swordParam.twoHanded ? Constants.SLOT_BOTH_HANDS : Constants.SLOT_RIGHT_HAND);
			return sword;
		}

		private static createRanged(x: number, y: number, name: string, rangedParam: RangedParam): Actor {
			var bow = new Actor();
			bow.init(x, y, ")", name, "weapon|ranged", 0xF0F0F0, true);
			bow.pickable = new Pickable(2);
			bow.equipment = new Equipment(rangedParam.twoHanded ? Constants.SLOT_BOTH_HANDS : Constants.SLOT_RIGHT_HAND);
			bow.ranged = new Ranged(rangedParam.damages, rangedParam.projectileTypeName, rangedParam.loadTime);
			return bow;
		}

		private static createStaff(x: number, y: number, name: string, staffParam: StaffParam): Actor {
			var staff = new Actor();
			staff.init(x, y, "/", name, "weapon|staff", 0xF0E020, true);
			staff.pickable = new Pickable(staffParam.weight);
			staff.equipment = new Equipment(staffParam.twoHanded ? Constants.SLOT_BOTH_HANDS : Constants.SLOT_RIGHT_HAND);
			staff.magic = new Magic(staffParam.maxCharges);
			staff.magic.setFireEffector(staffParam.fireEffect, new TargetSelector(staffParam.fireTargetSelectionMethod),
				staffParam.fireMessage);
			return staff;
		}

		private static createConditionStaff(x: number, y: number, name: string, staffParam: StaffParam): Actor {
			staffParam.fireEffect = new ConditionEffect(staffParam.condType, staffParam.nbTurns, staffParam.condMessage, staffParam.additionalArgs);
			return ActorFactory.createStaff(x, y, name, staffParam);
		}

		private static createProjectile(x: number, y: number, name: string, damages: number, projectileTypeName: string): Actor {
			var projectile = new Actor();
			projectile.init(x, y, "\\", name, "weapon|projectile|" + projectileTypeName, 0xD0D0D0, true);
			projectile.pickable = new Pickable(0.1);
			projectile.pickable.setOnThrowEffect(new InstantHealthEffect(-damages,
				"The " + name + " hits [the actor1] for [value1] points."),
				new TargetSelector( TargetSelectionMethod.ACTOR_ON_CELL));
			projectile.equipment = new Equipment(Constants.SLOT_QUIVER);
			return projectile;
		}

		private static createShield(x: number, y: number, name: string, defense: number): Actor {
			var shield = new Actor();
			shield.init(x, y, "[", name, "weapon|shield", 0xF0F0F0, true);
			shield.pickable = new Pickable(5);
			shield.pickable.setOnThrowEffect(new ConditionEffect(ConditionType.STUNNED, 2,
				"The shield hits [the actor1] and stuns [it]!"),
				new TargetSelector( TargetSelectionMethod.ACTOR_ON_CELL));
			shield.equipment = new Equipment(Constants.SLOT_LEFT_HAND, defense);
			return shield;
		}

		// miscellaneous
		private static createStairs(x: number, y: number, character: string, direction: string): Actor {
			var stairs: Actor = new Actor();
			stairs.init(x, y, character, "stairs " + direction, undefined, 0xFFFFFF, false);
			stairs.fovOnly = false;
			return stairs;
		}

		/*
			creature factories
		*/
		private static createBeast(x: number, y: number, character: string, name: string, corpseName: string, color: Yendor.Color,
			beastParam: BeastParam): Actor {
			var beast: Actor = new Actor();
			beast.init(x, y, character, name, "creature|beast", color, true);
			beast.destructible = new MonsterDestructible(beastParam.hp, beastParam.defense, corpseName);
			beast.attacker = new Attacker(beastParam.attack, beastParam.walkTime);
			beast.ai = new MonsterAi(beastParam.walkTime);
			beast.blocks = true;
			beast.destructible.xp = beastParam.xp;
			return beast;
		}

		private static createPlayer(x: number, y: number): Player {
			var player = new Player();
			player.init(x, y, "@", "player", 0xFFFFFF);
			return player;
		}
	}
	/*
		Class: ActorManager
		Stores all the actors in the game.
	*/
	export class ActorManager {
		private player: Player;
		private stairsUp: Actor;
		private stairsDown: Actor;
		private creatures: Actor[];
		private corpses: Actor[];
		private updatingCorpses: Actor[];
		private items: Actor[];
		private scheduler: Yendor.Scheduler = new Yendor.Scheduler();

		getPlayer() : Player {
			return this.player;
		}

		addCreature( actor: Actor ) {
			this.creatures.push(actor);
			this.scheduler.add(actor);
		}

		addItem( actor: Actor ) {
			this.items.push(actor);
		}

		getCreatures(): Actor[] {
			return this.creatures;
		}

		getItems(): Actor[] {
			return this.items;
		}

		getCorpses(): Actor[] {
			return this.corpses;
		}

		getStairsUp(): Actor {
			return this.stairsUp;
		}

		getStairsDown(): Actor {
			return this.stairsDown;
		}

		clear() {
			this.creatures = [];
			this.corpses = [];
			this.updatingCorpses = [];
			this.items = [];
			this.scheduler.clear();
		}

		private renderActorList(actors: Actor[], root: Yendor.Console) {
			var nbActors: number = actors.length;
			for (var i: number = 0; i < nbActors; i++) {
				var actor: Actor = actors[i];
				if ( Engine.instance.map.shouldRenderActor(actor) ) {
					actor.render(root);
				}
			}
		}

		renderActors(root: Yendor.Console) {
			this.renderActorList(this.corpses, root);
			this.renderActorList(this.items, root);
			this.renderActorList(this.creatures, root);
		}

		isPlayerDead(): boolean {
			return this.player.destructible.isDead();
		}

		/*
			Function: updateActors
			Triggers actors' A.I. during a new game turn.
			Moves the dead actors from the actor list to the corpse list.
		*/
		updateActors() {
			this.scheduler.run();
			this.moveDeadToCorpse();
			this.updateCorpses();
		}

		private moveDeadToCorpse() {
			for ( var i: number = 0, len: number = this.creatures.length; i < len; ++i) {
				var actor: Actor = this.creatures[i];
				if ( actor.destructible && actor.destructible.isDead() ) {
					// actor is dead. move it to corpse list
					// note that corpses must still be updated until they have no active conditions
					// for example, to make it possible for corpses to unfreeze.
					if (! actor.ai.hasActiveConditions()) {
						this.scheduler.remove(actor);
					} else {
						this.updatingCorpses.push(actor);
					}
					this.creatures.splice( i, 1);
					i--;
					len--;
					this.corpses.push(actor);
				}
			}
		}

		private updateCorpses() {
			for ( var i: number = 0, len: number = this.updatingCorpses.length; i < len; --i) {
				var actor: Actor = this.updatingCorpses[i];
				if ( ! actor.ai.hasActiveConditions()) {
					this.scheduler.remove(actor);
					this.updatingCorpses.splice(i, 1);
					i--;
					len--;
				}
			}
		}

		resume() {
			this.scheduler.resume();
		}

		pause() {
			if (! this.isPaused()) {
				Engine.instance.saveGame();
			}
			this.scheduler.pause();
		}

		isPaused() {
			return this.scheduler.isPaused();
		}

		removeItem(item: Actor) {
			var idx: number = this.items.indexOf(item);
			if ( idx !== -1 ) {
				this.items.splice(idx, 1);
			}
		}

		/*
			Function: createStairs
			Create the actors for up and down stairs. The position is not important, actors will be placed by the dungeon builder.
		*/
		createStairs() {
			this.stairsUp = ActorFactory.create(ActorType.STAIR_UP);
			this.stairsDown = ActorFactory.create(ActorType.STAIR_DOWN);
			this.items.push(this.stairsUp);
			this.items.push(this.stairsDown);
		}

		createPlayer() {
			this.player = <Player>ActorFactory.create(ActorType.PLAYER);
			this.addCreature(this.player);
		}

		load(persister: Persister) {
			this.creatures = persister.loadFromKey(Constants.PERSISTENCE_ACTORS_KEY);
			this.scheduler.addAll(this.creatures);
			this.player = <Player>this.creatures[0];
			this.items = persister.loadFromKey(Constants.PERSISTENCE_ITEMS_KEY);
			this.stairsUp = this.items[0];
			this.stairsDown = this.items[1];
			this.corpses = persister.loadFromKey(Constants.PERSISTENCE_CORPSES_KEY);
			this.updatingCorpses = persister.loadFromKey(Constants.PERSISTENCE_UPDATING_CORPSES_KEY);
		}

		save(persister: Persister) {
			persister.saveToKey(Constants.PERSISTENCE_ACTORS_KEY, this.creatures);
			persister.saveToKey(Constants.PERSISTENCE_ITEMS_KEY, this.items);
			persister.saveToKey(Constants.PERSISTENCE_CORPSES_KEY, this.corpses);
			persister.saveToKey(Constants.PERSISTENCE_UPDATING_CORPSES_KEY, this.updatingCorpses);
		}

		deleteSavedGame(persister: Persister) {
			persister.deleteKey(Constants.PERSISTENCE_ACTORS_KEY);
			persister.deleteKey(Constants.PERSISTENCE_ITEMS_KEY);
			persister.deleteKey(Constants.PERSISTENCE_CORPSES_KEY);
			persister.deleteKey(Constants.PERSISTENCE_UPDATING_CORPSES_KEY);
		}
		/*
			Function: findClosestActor

			In the `actors` array, find the closest actor (except the player) from position `pos` within `range`.
			If range is 0, no range limitation.
		*/
		findClosestActor( pos: Yendor.Position, range: number, actors: Actor[] ) : Actor {
			var bestDistance: number = 1E8;
			var closestActor: Actor = undefined;
			var player: Actor = this.getPlayer();
			actors.forEach(function(actor: Actor) {
				if ( actor !== player ) {
					var distance: number = Yendor.Position.distance(pos, actor);
					if ( distance < bestDistance && (distance < range || range === 0) ) {
						bestDistance = distance;
						closestActor = actor;
					}
				}
			});
			return closestActor;
		}

		/*
			Function: findActorsOnCell

			Parameters:
			pos - a position on the map
			actors - the list of actors to scan (either actors, corpses or items)

			Returns:
			an array containing all the living actors on the cell

		*/
		findActorsOnCell( pos: Yendor.Position, actors: Actor[]) : Actor[] {
			var actorsOnCell: Actor[] = [];
			var nbActors: number = actors.length;
			for (var i: number = 0; i < nbActors; i++) {
				var actor: Actor = actors[i];
				if ( actor.x === pos.x && actor.y === pos.y ) {
					actorsOnCell.push(actor);
				}
			}
			return actorsOnCell;
		}

		/*
			Function: findActorsInRange
			Returns all actor near a position

			Parameters:
			pos - a position on the map
			range - maximum distance from position
			actors - actor array to look up

			Returns:
			an actor array containing all actor within range
		*/
		findActorsInRange( pos: Yendor.Position, range: number, actors: Actor[]): Actor[] {
			var actorsInRange: Actor[] = [];
			var nbActors: number = actors.length;
			for (var i: number = 0; i < nbActors; i++) {
				var actor: Actor = actors[i];
				if (Yendor.Position.distance(pos, actor) <= range ) {
					actorsInRange.push( actor );
				}
			}
			return actorsInRange;
		}
	}

	/********************************************************************************
	 * Group: combat
	 ********************************************************************************/

	/*
		Class: Destructible
		Something that can take damages and heal/repair.
	*/
	export class Destructible implements Persistent {
		className: string;
		private _maxHp: number;
		private _defense: number;
		private _hp: number;
		private _corpseName: string;
		private _xp: number = 0;
		/*
			Constructor: constructor

			Parameters:
			_maxHp - initial amount of health points
			_defense - when attacked, how much hit points are deflected
			_corpseName - new name of the actor when its health points reach 0
		*/
		constructor(_maxHp: number = 0, _defense: number = 0, _corpseName: string = "") {
			this.className = "Destructible";
			this._hp = _maxHp;
			this._maxHp = _maxHp;
			this._defense = _defense;
			this._corpseName = _corpseName;
		}

		get hp() { return this._hp; }
		set hp(newValue: number) { this._hp = newValue; }

		get xp() { return this._xp; }
		set xp(newValue: number) { this._xp = newValue; }

		get maxHp() { return this._maxHp; }

		get defense() { return this._defense; }
		set defense(newValue: number) { this._defense = newValue; }

		isDead(): boolean {
			return this._hp <= 0;
		}

		public computeRealDefense(owner: Actor): number {
			var realDefense = this.defense;
			if ( owner.container ) {
				// add bonus from equipped items
				// TODO shield can block only one attack per turn
				var n: number = owner.container.size();
				for ( var i: number = 0; i < n; i++) {
					var item: Actor = owner.container.get(i);
					if ( item.equipment && item.equipment.isEquipped() ) {
						realDefense += item.equipment.getDefenseBonus();
					}
				}
			}
			return realDefense;
		}

		/*
			Function: takeDamage
			Deals damages to this actor. If health points reach 0, call the die function.

			Parameters:
			owner - the actor owning this Destructible
			damage - amount of damages to deal

			Returns:
			the actual amount of damage taken
		*/
		takeDamage(owner: Actor, damage: number): number {
			damage -= this.computeRealDefense(owner);
			if ( damage > 0 ) {
				this._hp -= damage;
				if ( this.isDead() ) {
					this._hp = 0;
					this.die(owner);
				}
			} else {
				damage = 0;
			}
			return damage;
		}

		/*
			Function: heal
			Recover some health points

			Parameters:
			amount - amount of health points to recover

			Returns:
			the actual amount of health points recovered
		*/
		heal(amount: number): number {
			this._hp += amount;
			if ( this._hp > this._maxHp ) {
				amount -= this._hp - this._maxHp;
				this._hp = this._maxHp;
			}
			return amount;
		}

		/*
			Function: die
			Turn this actor into a corpse

			Parameters:
			owner - the actor owning this Destructible
		*/
		die(owner: Actor) {
			owner.ch = "%";
			owner.name = this._corpseName;
			owner.blocks = false;
		}
	}

	/*
		Class: Attacker
		An actor that can deal damages to another one
	*/
	export class Attacker implements Persistent {
		className: string;
		private _power: number;
		private _attackTime: number;
		/*
			Constructor: constructor

			Parameters:
			_power : amount of damages given
		*/
		constructor(_power: number = 0, attackTime: number = Constants.PLAYER_WALK_TIME) {
			this.className = "Attacker";
			this._power = _power;
			this._attackTime = attackTime;
		}

		/*
			Property: power
			Amount of damages given
		*/
		get power() { return this._power; }
		set power(newValue: number) { this._power = newValue; }

		get attackTime() { return this._attackTime; }

		/*
			Function: attack
			Deal damages to another actor

			Parameters:
			owner - the actor owning this Attacker
			target - the actor being attacked
		*/
		attack(owner: Actor, target: Actor) {
			if ( target.destructible && ! target.destructible.isDead() ) {
				var damage = this._power - target.destructible.computeRealDefense(target);
				var msg: string = "[The actor1] attack[s] [the actor2]";
				var msgColor: Yendor.Color;
				if ( damage >= target.destructible.hp ) {
					msg += " and kill[s] [it2] !";
					msgColor = Constants.LOG_WARN_COLOR;
				} else if ( damage > 0 ) {
					msg += " for " + damage + " hit points.";
					msgColor = Constants.LOG_WARN_COLOR;
				} else {
					msg += " but it has no effect!";
				}
				log(transformMessage(msg, owner, target), msgColor);
				target.destructible.takeDamage(target, this._power);
			}
		}
	}

	/********************************************************************************
	 * Group: inventory
	 ********************************************************************************/

	 /*
	 	Interface: ContainerListener
	 	Something that must be notified when an item is added or removed from the container
	 */
	 export interface ContainerListener {
	 	onAdd(item: Actor, container: Container, owner: Actor);
	 	onRemove(item: Actor, container: Container, owner: Actor);
	 }
	 /*
	 	Class: Container
	 	An actor that can contain other actors :
	 	- creatures with inventory
	 	- chests, barrels, ...
	 */
	 export class Container implements Persistent {
		className: string;
	 	private _capacity: number;
	 	private actors: Actor[] = [];
	 	private __listener: ContainerListener;

	 	/*
	 		Constructor: constructor

	 		Parameters:
	 		_capacity - this container's maximum weight
	 	*/
	 	constructor(_capacity: number = 0, listener?: ContainerListener) {
			this.className = "Container";
	 		this._capacity = _capacity;
	 		this.__listener = listener;
	 	}

	 	get capacity(): number { return this._capacity; }
	 	set capacity(newValue: number) {this._capacity = newValue; }
	 	size(): number { return this.actors.length; }

	 	// used to rebuilt listener link after loading
	 	setListener(listener: ContainerListener) {
	 		this.__listener = listener;
	 	}

	 	get(index: number) : Actor {
	 		return this.actors[index];
	 	}

	 	getFromSlot(slot: string): Actor {
	 		var n: number = this.size();
	 		for ( var i: number = 0; i < n; i++) {
	 			var actor: Actor = this.get(i);
	 			if ( actor.equipment && actor.equipment.isEquipped() && actor.equipment.getSlot() === slot ) {
	 				return actor;
	 			}
	 		}
	 		return undefined;
	 	}

	 	isSlotEmpty(slot: string): boolean {
	 		if ( this.getFromSlot(slot)) {
	 			return false;
	 		}
	 		if ( slot === Constants.SLOT_RIGHT_HAND || slot === Constants.SLOT_LEFT_HAND ) {
	 			if ( this.getFromSlot(Constants.SLOT_BOTH_HANDS)) {
	 				return false;
	 			}
	 		} else if ( slot === Constants.SLOT_BOTH_HANDS ) {
	 			if ( this.getFromSlot(Constants.SLOT_LEFT_HAND) || this.getFromSlot(Constants.SLOT_RIGHT_HAND) ) {
	 				return false;
	 			}
	 		}
	 		return true;
	 	}

	 	canContain(item: Actor): boolean {
	 		if (! item || ! item.pickable ) {
	 			return false;
	 		}
	 		return this.computeTotalWeight() + item.pickable.weight <= this._capacity;
	 	}

	 	computeTotalWeight(): number {
	 		var weight: number = 0;
	 		this.actors.forEach(function(actor: Actor) {
	 			if ( actor.pickable ) {
	 				weight += actor.pickable.weight;
	 			}
	 		});
	 		return weight;
	 	}

	 	/*
	 		Function: add
	 		add a new actor in this container

	 		Parameters:
	 		actor - the actor to add

	 		Returns:
	 		false if the operation failed because the container is full
	 	*/
	 	add(actor: Actor, owner: Actor) {
	 		var weight: number = this.computeTotalWeight();
	 		if ( actor.pickable.weight + weight > this._capacity ) {
	 			return false;
	 		}
	 		this.actors.push( actor );
	 		if (this.__listener) {
	 			this.__listener.onAdd(actor, this, owner);
	 		}
	 		return true;
	 	}

	 	/*
	 		Function: remove
	 		remove an actor from this container

	 		Parameters:
	 		actor - the actor to remove
	 		owner - the actor owning the container
	 	*/
	 	remove(actor: Actor, owner: Actor) {
	 		var idx: number = this.actors.indexOf(actor);
	 		if ( idx !== -1 ) {
	 			this.actors.splice(idx, 1);
		 		if (this.__listener) {
		 			this.__listener.onRemove(actor, this, owner);
		 		}
	 		}
	 	}
	}

	/********************************************************************************
	 * Group: actors
	 ********************************************************************************/
	 /*
	 	Class: Actor
	 	The base class for all actors
	 */
	export class Actor extends Yendor.Position implements Persistent, Yendor.TimedEntity {
		className: string;
		private _type: ActorClass;
		// the ascii code of the symbol representing this actor on the map
		private _ch: number;
		// the name to be used by mouse look or the inventory screen
		private _name: string;
		// the color associated with this actor's symbol
		private _col: Yendor.Color;

		// can be destroyed/killed
		private _destructible: Destructible;
		// can deal damages
		private _attacker: Attacker;
		// can think
		private _ai: Ai;
		// can be picked (put inside a container actor)
		private _pickable: Pickable;
		// can contain other actors
		private _container: Container;
		// can be equipped on a slot
		private _equipment: Equipment;
		// can throw away some type of actors
		private _ranged: Ranged;
		// has magic properties
		private _magic: Magic;

		// whether you can walk on the tile where this actor is
		private _blocks: boolean = false;
		// whether you can see this actor only if it's in your field of view
		private _fovOnly: boolean = true;
		// whether this actor name is singular (you can write "a <name>")
		private _singular: boolean = true;

		constructor() {
			super();
			this.className = "Actor";
		}

		init(_x: number = 0, _y: number = 0, _ch: string = "", _name: string = "", types: string = "",
			_col: Yendor.Color = "", singular: boolean = true) {
			this.moveTo(_x, _y);
			this._ch = _ch.charCodeAt(0);
			this._name = _name;
			this._col = _col;
			this._singular = singular;
			this._type = types ? ActorClass.buildClassHierarchy(types) : ActorClass.getRoot();
		}

		get waitTime() { return this.ai ? this.ai.waitTime : undefined ; }
		set waitTime(newValue: number) {
			if (this.ai) {
				this.ai.waitTime = newValue;
			}
		}

		isA(type: ActorClass): boolean {
			return this._type.isA(type);
		}

		get ch() { return String.fromCharCode(this._ch); }
		set ch(newValue: string) { this._ch = newValue.charCodeAt(0); }

		get col() { return this._col; }
		set col(newValue: Yendor.Color) { this._col = newValue; }

		get name() { return this._name; }
		set name(newValue: string) { this._name = newValue; }

		isSingular(): boolean {
			return this._singular;
		}

		isStackable(): boolean {
			return ! this.destructible && (! this.equipment || ! this.equipment.isEquipped() || this.equipment.getSlot() === Constants.SLOT_QUIVER);
		}

		isBlocking(): boolean {
			return this._blocks;
		}
		set blocks(newValue: boolean) { this._blocks = newValue; }

		isFovOnly(): boolean {
			return this._fovOnly;
		}
		set fovOnly(newValue: boolean) { this._fovOnly = newValue; }

		get destructible() { return this._destructible; }
		set destructible(newValue: Destructible) { this._destructible = newValue; }

		get attacker() { return this._attacker; }
		set attacker(newValue: Attacker) { this._attacker = newValue; }

		get ai() { return this._ai; }
		set ai(newValue: Ai) { this._ai = newValue; }

		get pickable() {return this._pickable; }
		set pickable(newValue: Pickable) { this._pickable = newValue; }

		get container() {return this._container; }
		set container(newValue: Container) {this._container = newValue; }

		get equipment() {return this._equipment; }
		set equipment(newValue: Equipment) {this._equipment = newValue; }

		get ranged() { return this._ranged; }
		set ranged(newValue: Ranged) { this._ranged = newValue; }

		get magic() { return this._magic; }
		set magic(newValue: Magic) { this._magic = newValue; }

		/*
			Function: getaname
			Returns " a <name>" or " an <name>" or " <name>"
		*/
		getaname(): string {
			if ( !this.isSingular() ) {
				return " " + this.name;
			}
			var article: string = ("aeiou".indexOf(this.name[0]) !== -1 ? " an " : " a ");
			return article + this.name;
		}

		/*
			Function: getAname
			Returns "A <name>" or "An <name>" or "<name>"
		*/
		getAname(): string {
			if ( !this.isSingular() ) {
				return this.name;
			}
			var article: string = ("aeiou".indexOf(this.name[0]) !== -1 ? "An " : "A ");
			return article + this.name;
		}

		/*
			Function: getAname
			Returns "There's a <name>" or "There's an <name>" or "There are <name>"
		*/
		getTheresaname(): string {
			var verb = this.isSingular() ? "'s" : " are";
			return "There" + verb + this.getaname();
		}

		/*
			Function: getAname
			Returns " the <name>"
		*/
		getthename(): string {
			return " the " + this.name;
		}

		/*
			Function: getAname
			Returns "The <name>"
		*/
		getThename(): string {
			return "The " + this.name;
		}

		/*
			Function: getAname
			Returns "The <name>'s "
		*/
		getThenames(): string {
			return this.getThename() + "'s ";
		}

		/*
			Function: getAname
			Returns " the <name>'s "
		*/
		getthenames(): string {
			return this.getthename() + "'s ";
		}

		getits(): string {
			return " its ";
		}

		getit(): string {
			return " it";
		}

		getis(): string {
			return this.isSingular() ? " is" : " are";
		}

		getVerbEnd(): string {
			return this.isSingular() ? "s" : "";
		}

		getDescription(): string {
			var desc = this.name;
			if ( this._equipment && this._equipment.isEquipped()) {
				desc += " (on " + this._equipment.getSlot() + ")";
			}
			if ( this._ai ) {
				var condDesc: string = this._ai.getConditionDescription();
				if ( condDesc ) {
					desc += " (" + condDesc + ")";
				}
			}
			return desc;
		}

		update() {
			if ( this._ai ) {
				this._ai.update(this);
			}
		}

		render(root: Yendor.Console) {
			root.text[this.x][this.y] = this._ch;
			root.fore[this.x][this.y] = this._col;
		}

		/*
			Function: postLoad
			json.stringify cannot handle cyclic dependencies so we have to rebuild them here
		*/
		postLoad() {
			// rebuild container -> listener backlinks
			if ( this.ai && this.container ) {
				this.container.setListener(this.ai);
			}
		}

	}
}
