import { bufferCV, bufferCVFromString, ClarityValue } from "@stacks/transactions";
import { hexToBytes as hexToBytesMS } from "micro-stacks/common";


export const getUniqueNonce: () => number = (() => {
  var private_count: number = 0;

  var increment: () => number = () => {
    private_count += 1;
    return private_count;
  };

  return increment;
})();

/**
 * Shift a number's decimal place by a specified amount.
 *
 * @param {number} value - The value to be shifted.
 * @param {number} shift - The number of decimal places to shift the value by.
 * @param {boolean} [unshift] - boolean - if true, the value will be unshifted.
 * @returns The resulting shifted number.
 */
export function customShiftValue(value: number, shift: number, unshift?: boolean) {
  return unshift ? value / (10 ** shift) : value * (10 ** shift);
}

/**
 * The function takes a number, shifts the decimal place by two
 * @param {number} value - number - the value to be shifted e.g. 160000
 * @returns e.g. 1600.00
 */
export function fixedTwoDecimalShift(value: number) {
  return customShiftValue(value, 2, true).toFixed(2);
}

export function hex2ascii(hexx: any | undefined): string {
  if (!hexx) return "";
  var hex = hexx.toString();
  var str = '';
  for (var i = 2; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

export function timestampToDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleString();
}

// The following are from the RedStone helper library for Stacks.

/**
 * Utility conversion function that can take both 0x prefixed
 * and unprefixed hex strings.
 * @param hex
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  return hexToBytesMS(hex.substring(0, 2) === '0x' ? hex.substring(2) : hex);
}

/**
 * Converts a lite signature to the format expected by Stacks. It merely
 * subtracts 27 from the recovery byte and returns it as a Uint8Array.
 * @param liteSignature
 * @returns Uint8Array
 */
export function liteSignatureToStacksSignature(liteSignature: Uint8Array | string) {
  if (typeof liteSignature === 'string')
    liteSignature = hexToBytes(liteSignature);
  if (liteSignature.byteLength !== 65)
    throw new Error(`Invalid liteSignature, expected 65 bytes got ${liteSignature.byteLength}`);
  let converted = new Uint8Array(liteSignature);
  if (converted[64] > 3)
    converted[64] -= 27; // subtract from V
  return converted;
}

/**
 * Shifts the price value according to RedStone serialisation.
 * @param value
 * @returns shifted value
 */
export function shiftPriceValue(value: number) {
  return Math.round(value * (10 ** 8))
}

/**
 * It takes a string and returns a ClarityValue based on length
 * @param {string} uuid - The UUID to convert to a ClarityValue
 * @returns A ClarityValue
 */
export function uuidToCV(uuid: string): ClarityValue {
  return uuid.length > 8 ? bufferCV(hexToBytes(uuid)) : bufferCVFromString(uuid);
}

export function uuidResponseToString(uuid: string): string {
  return uuid.length > 8 ? uuid : hex2ascii(uuid);
}
