/**
	Section: Persistence
*/

module Core {
    "use strict";

	/**
		Interface: Persistent
		Anything that can be saved and restored.
		The constructor must initialize the className field.
		Fields starting with two underscores are not persisted.
		Watch out for cycling dependencies!
        During loading phase, the constructor is called without parameters.
        Then field values are restored from the saved json.
	*/
    export interface Persistent {
		/**
			Property: className
			The name of the class must be saved along with the object properties
			to be able to restore the right type of object when loading from
			the database. If class MyClass is inside module MyModule, use "MyModule.MyClass" syntax.
		*/
        className: string;
		/**
			Function: load
			Optional custom loading function.

			Parameters:
			jsonData - parsed json data to load from
		*/
        load?: (jsonData: any) => any;
		/**
			Function: postLoad
			Optional function called after the object is loaded.
		*/
        postLoad?: () => void;
    }

	/**
		Interface: Persister
		Can save/load objects from a repository
	*/
    export interface Persister {
		/**
			Function: loadFromKey
			Retrieve an object from a given database key.

			Parameters :
			key - the database key
			object - if not provided, the persister will create the object
		*/
        loadFromKey(key: string, object?: any): any;
		/**
			Function: saveToKey
			Save an object into a database and associate it with given key

			Parameters :
			key - the database key you can use to get the object back with loadFromKey
			object - the object to save
		*/
        saveToKey(key: string, object: any);
		/**
			Function: deleteKey
			Delete the object associated with a key in the database

			Parameters:
			key - the database key
		*/
        deleteKey(key: string);
    }

	/**
		Class: LocalStoragePersister
		Implements Persister using the browser's HTML5 local storage.
		Note : in internet explorer, this only works with http://... URL. Local storage
		will be disabled if you open the game with a file://... URL.
	*/
    export class LocalStoragePersister implements Persister {
        private localStorage: any;
        constructor() {
            this.localStorage = localStorage || window.localStorage;
        }
        private getDataFromKey(key: string): any {
            if (!this.localStorage) {
                return undefined;
            }
            // TODO use a JSON reviver to skip intermediate jsonData step
            let jsonString: string = this.localStorage.getItem(key);
            if (!jsonString) {
                return undefined;
            }
            return JSON.parse(jsonString);
        }

        saveToKey(key: string, object: any) {
            if (!this.localStorage) {
                return;
            }
            this.localStorage.setItem(key,
                typeof object === "string" ? object : JSON.stringify(object, this.jsonReplacer));
        }

        private jsonReplacer(key: string, value: any) {
            // don't stringify fields starting with __
            if (key.indexOf("__") === 0) {
                return undefined;
            }
            return value;
        }

        deleteKey(key: string) {
            if (!this.localStorage) {
                return;
            }
            this.localStorage.removeItem(key);
        }

        loadFromKey(localStorageKey: string, object?: any): any {
            let jsonData: any = this.getDataFromKey(localStorageKey);
            if (!jsonData) {
                return undefined;
            }
            return this.loadFromData(jsonData, object);
        }

        private loadFromData(jsonData: any, object?: any): any {
            if (jsonData instanceof Array) {
                return this.loadArrayFromData(jsonData, object);
            } else if (typeof jsonData === "object") {
                let obj: any = this.loadObjectFromData(jsonData, object);
                if (obj.postLoad) {
                    obj.postLoad();
                }
                return obj;
            }
            // basic field, number, string, boolean, ...
            return jsonData;
        }

        private loadArrayFromData(jsonData: any, object?: any): Array<any> {
            let array = (object && typeof(object) === "array") ? object : [];
            for (let i: number = 0, len: number = jsonData.length; i < len; ++i) {
                array[i] = this.loadFromData(jsonData[i]);
            }
            return array;
        }

        private loadObjectFromData(jsonData: any, object?: any): any {
            if (!object) {
                if (!jsonData.className) {
                    object = {};
                } else {
                    let classNames = (<string>jsonData.className).split(".");
                    let clas: any = window[classNames[0]];
                    for (let i: number = 1, len: number=classNames.length; i < len ; ++i) {
                        clas = clas[classNames[i]];
                    }
                    object = Object.create(clas.prototype);
                    object.constructor.apply(object, []);
                }
            }
            if (object.load) {
                // use custom loading method
                object.load(jsonData);
            } else {
                // use generic loading method
                for (let field in jsonData) {
                    if (jsonData.hasOwnProperty(field)) {
                        object[field] = this.loadFromData(jsonData[field]);
                    }
                }
            }
            return object;
        }
    }
}