import { Observable } from "rxjs";
import { INode } from "./types";

// 添加ID生成功能
export function generateId(): string {
	return v4();
}

export function isINode(val: unknown): val is INode {
	return typeof val === 'object' && val !== null && 'type' in val;
}

export function isObservable<T = any>(val: unknown): val is Observable<T> {
	return val && Reflect.get(val, 'subscribe')
}

export const clone = (obj: any, seen = new WeakSet()): any => {
	if (obj === null || typeof obj !== 'object') return obj;
	if (seen.has(obj)) return undefined;

	if (obj instanceof Observable || typeof obj === 'function') {
		return undefined;
	}

	seen.add(obj);

	if (Array.isArray(obj)) {
		return obj.map(item => clone(item, seen)).filter(item => item !== undefined);
	}

	const cloned: any = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = clone(obj[key], seen);
			if (value !== undefined) {
				cloned[key] = value;
			}
		}
	}
	return cloned;
};

let IDX: number = 256;
const HEX: string[] = [];
let BUFFER: number[] | undefined;

while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

export function v4(): string {
	let i: number = 0;
	let num: number;
	let out: string = '';

	if (!BUFFER || ((IDX + 16) > 256)) {
		BUFFER = Array(i = 256);
		while (i--) BUFFER[i] = 256 * Math.random() | 0;
		i = IDX = 0;
	}

	for (; i < 16; i++) {
		num = BUFFER[IDX + i]!;
		if (i === 6) out += HEX[num & 15 | 64];
		else if (i === 8) out += HEX[num & 63 | 128];
		else out += HEX[num];

		if (i & 1 && i > 1 && i < 11) out += '-';
	}

	IDX++;
	return out;
}