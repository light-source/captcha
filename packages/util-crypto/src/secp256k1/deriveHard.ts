// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
	compactAddLength,
	isU8a,
	stringToU8a,
	u8aConcat,
} from "@polkadot/util";

import { blake2AsU8a } from "../blake2/asU8a.js";

const HDKD = compactAddLength(stringToU8a("Secp256k1HDKD"));

export function secp256k1DeriveHard(
	seed: Uint8Array,
	chainCode: Uint8Array,
): Uint8Array {
	if (!isU8a(chainCode) || chainCode.length !== 32) {
		throw new Error("Invalid chainCode passed to derive");
	}

	// NOTE This is specific to the Substrate HDD derivation, so always use the blake2 hasher
	return blake2AsU8a(u8aConcat(HDKD, seed, chainCode), 256);
}
