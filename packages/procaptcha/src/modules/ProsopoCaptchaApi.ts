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

import type { ProviderApi } from "@prosopo/api";
import { ProsopoDatasetError, ProsopoEnvError } from "@prosopo/common";
import {
	CaptchaMerkleTree,
	computeCaptchaSolutionHash,
} from "@prosopo/datasets";
import {
	ApiParams,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionResponse,
	type ProcaptchaApiInterface,
	type RandomProvider,
} from "@prosopo/types";
import type { TCaptchaSubmitResult } from "@prosopo/types";

export class ProsopoCaptchaApi implements ProcaptchaApiInterface {
	userAccount: string;
	provider: RandomProvider;
	providerApi: ProviderApi;
	dappAccount: string;
	_web2: boolean;

	constructor(
		userAccount: string,
		provider: RandomProvider,
		providerApi: ProviderApi,
		web2: boolean,
		dappAccount: string,
	) {
		this.userAccount = userAccount;
		this.provider = provider;
		this.providerApi = providerApi;
		this._web2 = web2;
		this.dappAccount = dappAccount;
	}

	get web2(): boolean {
		return this._web2;
	}

	public async getCaptchaChallenge(
		sessionId?: string,
	): Promise<CaptchaResponseBody> {
		try {
			const captchaChallenge = await this.providerApi.getCaptchaChallenge(
				this.userAccount,
				this.provider,
				sessionId,
			);

			if (captchaChallenge[ApiParams.error]) {
				return captchaChallenge;
			}

			// convert http to https
			for (const captcha of captchaChallenge.captchas) {
				for (const item of captcha.items) {
					if (item.data) {
						// drop the 'http:' prefix and replace it with https:
						item.data = `https://${item.data.replace(/^http(s)*:\/\//, "")}`;
					}
				}
			}

			return captchaChallenge;
		} catch (error) {
			throw new ProsopoEnvError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
				context: { error },
			});
		}
	}

	public async submitCaptchaSolution(
		userTimestampSignature: string,
		requestHash: string,
		solutions: CaptchaSolution[],
		timestamp: string,
		providerRequestHashSignature: string,
	): Promise<TCaptchaSubmitResult> {
		const tree = new CaptchaMerkleTree();

		const captchasHashed = solutions.map((captcha) =>
			computeCaptchaSolutionHash(captcha),
		);

		tree.build(captchasHashed);

		if (!tree.root) {
			throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
				context: { error: "Merkle tree root is undefined" },
			});
		}

		const commitmentId = tree.root.hash;

		let result: CaptchaSolutionResponse;

		try {
			result = await this.providerApi.submitCaptchaSolution(
				solutions,
				requestHash,
				this.userAccount,
				timestamp,
				providerRequestHashSignature,
				userTimestampSignature,
			);
		} catch (error) {
			throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
				context: { error },
			});
		}

		return [result, commitmentId];
	}
}

export default ProsopoCaptchaApi;
