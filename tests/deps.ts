// @ts-ignore-line
export { Clarinet, Tx, Chain, types } from 'https://deno.land/x/clarinet@v1.7.1/index.ts';
// @ts-ignore-line
export type { Account, Block } from 'https://deno.land/x/clarinet@v1.7.1/index.ts';
export {
  assertEquals,
  assertStringIncludes,
  assertNotEquals,
  assertMatch,
  // @ts-ignore-line
} from 'https://deno.land/std@0.196.0/testing/asserts.ts';

// @ts-ignore-line
import { types } from 'https://deno.land/x/clarinet@v1.7.1/index.ts';

export type PricePackage = {
  prices: { symbol: string; value: any }[];
  timestamp: number;
};

// One day Clarinet may be able to import actual project source files so we
// can stop repeating code.

export function hex2ascii(hexx: string) {
  let hex = hexx.toString(); //force conversion
  let str = '';
  for (let i = 2; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

export function shiftPriceValue(value: number) {
  return Math.round(value * 10 ** 8);
}

export function customShiftValue(value: number, decimals: number) {
  return Math.round(value * 10 ** decimals);
}

export function stringToUint8Array(input: string) {
  let codePoints = [];
  // @ts-ignore-line
  for (let i = 0; i < input.length; ++i) codePoints.push(input.charCodeAt(i));
  return new Uint8Array(codePoints);
}

export function pricePackageToCV(pricePackage: PricePackage) {
  return {
    timestamp: types.uint(pricePackage.timestamp),
    prices: types.list(
      pricePackage.prices.map((entry: { symbol: string; value: any }) =>
        types.tuple({
          symbol: types.buff(stringToUint8Array(entry.symbol)),
          value: types.uint(shiftPriceValue(entry.value)),
        })
      )
    ),
  };
}
