import SuperJSON from 'superjson';
// import { browser } from '$app/environment';

// TEST IMPLEMENTATION
import { BROWSER } from 'esm-env';
export const defaultWindow = BROWSER ? window : undefined;
export type ConfigurableWindow = {
	/** Provide a custom `window` object to use in place of the global `window` object. */
	window?: typeof globalThis & Window;
};
// TEST IMPLEMENTATION

// //#region advanced function

// /**
//  * Creates a shared persisted state object.
//  *
//  * This function initializes a reactive state object that is persisted in the browser's localStorage.
//  * The state is automatically saved to localStorage whenever it changes. It uses SuperJSON for serialization,
//  * so it can handle complex data types like Date objects and Sets.
//  *
//  * @template T - The type of the state object, which must be an object with key-value pairs.
//  * @param {string} localStorageID - The key used to get or set the value in localStorage.
//  * @param {T} defaultValue - The default value of the state object.
//  * @returns {T} - The reactive state object.
//  *
//  * @throws {Error} If the saved value in localStorage is invalid or null, the state is reset to the default value.
//  */
// export function PersistedStateObjectSimple<T>(localStorageID: string, defaultValue: T) {
// 	let v = $state(defaultValue);

// 	const idExistance = browser ? window.localStorage.getItem(localStorageID) : null;

// 	try {
// 		v = SuperJSON.parse(idExistance as string);
// 		if (v === null || v === undefined) {
// 			throw new Error('value is null');
// 		}
// 	} catch (err) {
// 		console.log(
// 			'error: invalid saved values for key' + localStorageID + '\nResetting to default\n',
// 			err
// 		);
// 		v = defaultValue;
// 	}

// 	$effect.root(() => {
// 		$effect(() => {
// 			if (browser) {
// 				window.localStorage.setItem(localStorageID, SuperJSON.stringify(v));
// 			}
// 		});
// 	});

// 	return v as T;
// }

// //#endregion

//#region advanced function with additional options for choosing whether to use SuperJSON or JSON

/**
 * Creates a shared persisted state object.
 *
 * This function initializes a reactive state object that is persisted in the browser's localStorage.
 * The state is automatically saved to localStorage whenever it changes. It uses SuperJSON for serialization,
 * so it can handle complex data types like Date objects and Sets.
 *
 * @template T - The type of the state object, which must be an object with key-value pairs.
 * @param {string} localStorageID - The key used to get or set the value in localStorage.
 * @param {T} defaultValue - The default value of the state object.
 * @param {boolean} useSuperJSON - A flag to determine whether to use SuperJSON for serialization.
 * @returns {T} - The reactive state object.
 *
 * @throws {Error} If the saved value in localStorage is invalid or null, the state is reset to the default value.
 */
export function PersistedStateObjectSimple<T>(
	localStorageID: string,
	defaultValue: T,
	useSuperJSON: boolean = true
): T {
	if (defaultWindow === undefined) {
		// console.log('PersistedState will not work for', localStorageID);
		return null as T;
	}

	let v = $state(defaultValue);
	const idExistance = window.localStorage.getItem(localStorageID);

	try {
		v = useSuperJSON ? SuperJSON.parse(idExistance as string) : JSON.parse(idExistance as string);
		if (v === null || v === undefined) {
			throw new Error('value is null');
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (err) {
		console.log('Invalid saved values for key: ' + localStorageID + '\nResetting to default\n');
		v = defaultValue;
	}

	$effect.root(() => {
		$effect(() => {
			window.localStorage.setItem(
				localStorageID,
				useSuperJSON ? SuperJSON.stringify(v) : JSON.stringify(v)
			);
		});
	});

	return v as T;
}

//#endregion
