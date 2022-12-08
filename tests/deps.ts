export { Clarinet, Tx, Chain, types } from 'https://deno.land/x/clarinet@v1.0.6/index.ts';
export type { Account, Block } from 'https://deno.land/x/clarinet@v1.0.6/index.ts';
export { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.164.0/testing/asserts.ts';

import { types } from 'https://deno.land/x/clarinet@v1.0.6/index.ts';

export type PricePackage = {
	prices: { symbol: string, value: any }[],
	timestamp: number
};

// One day Clarinet may be able to import actual project source files so we
// can stop repeating code.

export function hex2ascii(hexx: string) {
	let hex = hexx.toString();//force conversion
	let str = '';
	for (let i = 2; i < hex.length; i += 2)
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str;
}

export function shiftPriceValue(value: number) {
	return Math.round(value * (10 ** 8))
}

export function stringToUint8Array(input: string) {
	let codePoints = [];
	for (let i = 0; i < input.length; ++i)
		codePoints.push(input.charCodeAt(i));
	return new Uint8Array(codePoints);
}

export function pricePackageToCV(pricePackage: PricePackage) {
	return {
		timestamp: types.uint(pricePackage.timestamp),
		prices: types.list(
			pricePackage.prices.map((entry: { symbol: string, value: any }) => types.tuple({
				symbol: types.buff(stringToUint8Array(entry.symbol)),
				value: types.uint(shiftPriceValue(entry.value))
			}))
		)
	};
}
