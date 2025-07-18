// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { blake2b as blake2bJs } from "@noble/hashes/blake2b";
import { u8aToU8a } from "@polkadot/util";

import { createAsHex } from "../helpers.js";

/**
 * @name blake2AsU8a
 * @summary Creates a blake2b u8a from the input.
 * @description
 * From a `Uint8Array` input, create the blake2b and return the result as a u8a with the specified `bitLength`.
 * @example
 * <BR>
 *
 * ```javascript
 * import { blake2AsU8a } from '@polkadot/util-crypto';
 *
 * blake2AsU8a('abc'); // => [0xba, 0x80, 0xa5, 0x3f, 0x98, 0x1c, 0x4d, 0x0d]
 * ```
 */
export function blake2AsU8a(
	data: string | Uint8Array,
	bitLength: 64 | 128 | 256 | 384 | 512 = 256,
	key?: Uint8Array | null,
	onlyJs?: boolean,
): Uint8Array {
	const byteLength = Math.ceil(bitLength / 8);
	const u8a = u8aToU8a(data);

	return key
		? blake2bJs(u8a, { dkLen: byteLength, key })
		: blake2bJs(u8a, { dkLen: byteLength });
}

/**
 * @name blake2AsHex
 * @description Creates a blake2b hex from the input.
 */
export const blake2AsHex = /*#__PURE__*/ createAsHex(blake2AsU8a);
