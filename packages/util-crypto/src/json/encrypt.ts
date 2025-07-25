// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { EncryptedJson } from "./types.js";

import { u8aConcat } from "@polkadot/util";

import { naclEncrypt } from "../nacl/index.js";
import { scryptEncode, scryptToU8a } from "../scrypt/index.js";
import { jsonEncryptFormat } from "./encryptFormat.js";

export function jsonEncrypt(
	data: Uint8Array,
	contentType: string[],
	passphrase?: string | null,
): EncryptedJson {
	let isEncrypted = false;
	let encoded = data;

	if (passphrase) {
		const { params, password, salt } = scryptEncode(passphrase);
		const { encrypted, nonce } = naclEncrypt(encoded, password.subarray(0, 32));

		isEncrypted = true;
		encoded = u8aConcat(scryptToU8a(salt, params), nonce, encrypted);
	}

	return jsonEncryptFormat(encoded, contentType, isEncrypted);
}
