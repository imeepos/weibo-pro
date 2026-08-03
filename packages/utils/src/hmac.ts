import type { EncodingFormat, SHAFamily, TypedArray } from "./type";
import { hex } from "./hex";
import { base64, base64Url } from "./base64";
import { getWebcryptoSubtle } from "./index";
import { toUint8Array } from "./buffer";

/**
 * Decodes a hexadecimal string into raw bytes without going through TextDecoder,
 * so arbitrary (non-UTF-8) binary data such as HMAC signatures is preserved.
 */
function decodeHexString(data: string): Uint8Array {
	if (data.length % 2 !== 0) {
		throw new Error("Invalid hexadecimal string");
	}
	const bytes = new Uint8Array(data.length / 2);
	for (let i = 0; i < data.length; i += 2) {
		bytes[i / 2] = parseInt(data.slice(i, i + 2), 16);
	}
	return bytes;
}

export const createHMAC = <E extends EncodingFormat = "none">(
	algorithm: SHAFamily = "SHA-256",
	encoding: E = "none" as E,
) => {
	const hmac = {
		importKey: async (
			key: string | ArrayBuffer | TypedArray,
			keyUsage: "sign" | "verify",
		) => {
			const keyData = toUint8Array(key);
			return getWebcryptoSubtle().importKey(
				"raw",
				keyData,
				{ name: "HMAC", hash: { name: algorithm } },
				false,
				[keyUsage],
			);
		},
		sign: async (
			hmacKey: string | CryptoKey,
			data: string | ArrayBuffer | TypedArray,
		): Promise<E extends "none" ? ArrayBuffer : string> => {
			if (typeof hmacKey === "string") {
				hmacKey = await hmac.importKey(hmacKey, "sign");
			}
			const messageData = toUint8Array(data);
			const signature = await getWebcryptoSubtle().sign(
				"HMAC",
				hmacKey,
				messageData,
			);
			if (encoding === "hex") {
				return hex.encode(signature) as any;
			}
			if (encoding === "base64") {
				return base64.encode(signature) as any;
			}
			if (encoding === "base64url" || encoding === "base64urlnopad") {
				return base64Url.encode(signature, {
					padding: encoding !== "base64urlnopad",
				}) as any;
			}
			return signature as any;
		},
		verify: async (
			hmacKey: CryptoKey | string,
			data: string | ArrayBuffer | TypedArray,
			signature: string | ArrayBuffer | TypedArray,
		) => {
			if (typeof hmacKey === "string") {
				hmacKey = await hmac.importKey(hmacKey, "verify");
			}
			if (encoding === "hex") {
				if (typeof signature === "string") {
					signature = decodeHexString(signature);
				}
			}
			if (
				encoding === "base64" ||
				encoding === "base64url" ||
				encoding === "base64urlnopad"
			) {
				signature = await base64.decode(signature);
			}
			const signatureData = toUint8Array(signature);
			const messageData = toUint8Array(data);
			return getWebcryptoSubtle().verify(
				"HMAC",
				hmacKey,
				signatureData,
				messageData,
			);
		},
	};
	return hmac;
};