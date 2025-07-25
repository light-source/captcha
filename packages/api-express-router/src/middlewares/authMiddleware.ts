// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { hexToU8a, isHex } from "@polkadot/util";
import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";

export const authMiddleware = (
	pair: KeyringPair | undefined,
	authAccount?: KeyringPair | undefined,
) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { signature, timestamp } = extractHeaders(req);

			let error: ProsopoApiError | undefined;

			if (authAccount) {
				try {
					verifySignature(signature, timestamp, authAccount);
					next();
					return;
				} catch (e: unknown) {
					// need to fall through to the verifySignature check
					req.logger.warn(() => ({
						err: e,
						data: {
							account: authAccount?.address,
						},
					}));
					error = e as ProsopoApiError;
				}
			}

			if (pair) {
				verifySignature(signature, timestamp, pair);
				next();
				return;
			}

			res.status(401).json({
				error: "Unauthorized",
				message: new ProsopoEnvError(error || "CONTRACT.CANNOT_FIND_KEYPAIR"),
			});
			return;
		} catch (err) {
			req.logger.error(() => ({ err, msg: "Auth Middleware Error" }));
			res.status(401).json({ error: "Unauthorized", message: err });
			return;
		}
	};
};

const extractHeaders = (req: Request) => {
	const signature = req.headers.signature as string;
	const timestamp = req.headers.timestamp as string;

	if (!timestamp) {
		throw new ProsopoApiError("GENERAL.INVALID_TIMESTAMP", {
			context: { error: "Missing timestamp", code: 400 },
		});
	}

	if (!signature) {
		throw new ProsopoApiError("GENERAL.INVALID_SIGNATURE", {
			context: { error: "Missing signature", code: 400 },
		});
	}

	if (
		Array.isArray(signature) ||
		Array.isArray(timestamp) ||
		!isHex(signature)
	) {
		throw new ProsopoApiError("CONTRACT.INVALID_DATA_FORMAT", {
			context: { error: "Invalid header format", code: 400 },
		});
	}

	// check if timestamp is from the last 5 minutes
	const now = new Date().getTime();
	const ts = Number.parseInt(timestamp);

	if (now - ts > 300000) {
		throw new ProsopoApiError("GENERAL.INVALID_TIMESTAMP", {
			context: { error: "Timestamp is too old", code: 400 },
		});
	}

	return { signature, timestamp };
};

export const verifySignature = (
	signature: string,
	message: string,
	pair: KeyringPair,
) => {
	const u8Sig = hexToU8a(signature);

	if (!pair.verify(message, u8Sig, pair.publicKey)) {
		throw new ProsopoApiError("GENERAL.INVALID_SIGNATURE", {
			context: {
				error: "Signature verification failed",
				code: 401,
				account: pair.address,
				message,
				signature,
			},
		});
	}
};
