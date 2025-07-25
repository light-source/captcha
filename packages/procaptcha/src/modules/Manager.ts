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

import { stringToHex } from "@polkadot/util/string";
import { ProviderApi } from "@prosopo/api";
import {
	ProsopoDatasetError,
	ProsopoEnvError,
	ProsopoError,
} from "@prosopo/common";
import {
	ExtensionLoader,
	buildUpdateState,
	getRandomActiveProvider,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { getDefaultEvents } from "@prosopo/procaptcha-common";
import {
	type Account,
	ApiParams,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type FrictionlessState,
	type ProcaptchaCallbacks,
	type ProcaptchaClientConfigInput,
	type ProcaptchaClientConfigOutput,
	ProcaptchaConfigSchema,
	type ProcaptchaState,
	type ProcaptchaStateUpdateFn,
	type TCaptchaSubmitResult,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { at, hashToHex } from "@prosopo/util";
import { sleep } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import ProsopoCaptchaApi from "./ProsopoCaptchaApi.js";

const defaultState = (): Partial<ProcaptchaState> => {
	return {
		// note order matters! see buildUpdateState. These fields are set in order, so disable modal first, then set loading to false, etc.
		showModal: false,
		loading: false,
		index: 0,
		challenge: undefined,
		solutions: undefined,
		isHuman: false,
		captchaApi: undefined,
		account: undefined,
		// don't handle timeout here, this should be handled by the state management
	};
};

/**
 * The state operator. This is used to mutate the state of Procaptcha during the captcha process. State updates are published via the onStateUpdate callback. This should be used by frontends, e.g. react, to maintain the state of Procaptcha across renders.
 */
export function Manager(
	configOptional: ProcaptchaClientConfigOutput,
	state: ProcaptchaState,
	onStateUpdate: ProcaptchaStateUpdateFn,
	callbacks: ProcaptchaCallbacks,
	frictionlessState?: FrictionlessState,
) {
	const events = getDefaultEvents(callbacks);

	// get the state update mechanism
	const updateState = buildUpdateState(state, onStateUpdate);

	/**
	 * Build the config on demand, using the optional config passed in from the outside. State may override various
	 * config values depending on the state of the captcha process. E.g. if the process has been started using account
	 * "ABC" and then the user changes account to "DEF" via the optional config prop, the account in use will not change.
	 * This is because the captcha process has already been started using account "ABC".
	 * @returns the config for procaptcha
	 */
	const getConfig = () => {
		const config: ProcaptchaClientConfigInput = {
			userAccountAddress: "",
			...configOptional,
		};
		// overwrite the account in use with the one in state if it exists. Reduces likelihood of bugs where the user
		// changes account in the middle of the captcha process.
		if (state.account) {
			config.userAccountAddress = state.account.account.address;
		}
		return ProcaptchaConfigSchema.parse(config);
	};

	/**
	 * Called on start of user verification. This is when the user ticks the box to claim they are human.
	 */
	const start = async () => {
		events.onOpen();
		await providerRetry(
			async () => {
				if (state.loading) {
					return;
				}
				if (state.isHuman) {
					return;
				}

				// set the loading flag to true (allow UI to show some sort of loading / pending indicator while we get the captcha process going)
				updateState({ loading: true });
				updateState({
					attemptCount: state.attemptCount ? state.attemptCount + 1 : 1,
				});
				updateState({
					sessionId: frictionlessState?.sessionId,
				});

				// snapshot the config into the state
				const config = getConfig();
				updateState({ dappAccount: config.account.address });

				// allow UI to catch up with the loading state
				await sleep(100);

				const account = await loadAccount();

				let captchaApi = state.captchaApi;

				if (!frictionlessState?.provider) {
					// Get a new random provider if
					// - we don't have a provider api instance (first time)
					// - we do have a provider api instance but no sessionId (image captcha only)
					const getRandomProviderResponse = await getRandomActiveProvider(
						getConfig(),
					);

					const providerUrl = getRandomProviderResponse.provider.url;
					// get the provider api inst
					const providerApi = await loadProviderApi(providerUrl);

					captchaApi = new ProsopoCaptchaApi(
						account.account.address,
						getRandomProviderResponse,
						providerApi,
						config.web2,
						config.account.address || "",
					);
					updateState({ captchaApi });
				} else {
					const providerUrl = frictionlessState.provider.provider.url;
					const providerApi = await loadProviderApi(providerUrl);
					captchaApi = new ProsopoCaptchaApi(
						account.account.address,
						frictionlessState.provider,
						providerApi,
						config.web2,
						config.account.address || "",
					);
					updateState({ captchaApi });
				}

				const challenge = await captchaApi?.getCaptchaChallenge(
					state.sessionId,
				);

				if (challenge.error) {
					updateState({
						loading: false,
						error: {
							message: challenge.error.message,
							key: challenge.error.key || "API.UNKNOWN_ERROR",
						},
					});
					events.onError(new Error(challenge.error?.message));
				} else {
					if (challenge.captchas.length <= 0) {
						throw new ProsopoDatasetError("DEVELOPER.PROVIDER_NO_CAPTCHA");
					}

					// setup timeout, taking the timeout from the individual captcha or the global default
					const timeMillis: number = challenge.captchas
						.map(
							(captcha) =>
								captcha.timeLimitMs || config.captchas.image.challengeTimeout,
						)
						.reduce((a: number, b: number) => a + b);
					const timeout = setTimeout(() => {
						events.onChallengeExpired();
						// expired, disallow user's claim to be human
						updateState({ isHuman: false, showModal: false, loading: false });
					}, timeMillis);

					// update state with new challenge
					updateState({
						index: 0,
						solutions: challenge.captchas.map(() => []),
						challenge,
						showModal: true,
						timeout,
						loading: false,
					});
				}
			},
			start,
			resetState,
			state.attemptCount,
			10,
		);
	};

	const submit = async () => {
		await providerRetry(
			async () => {
				// disable the time limit, user has submitted their solution in time
				clearTimeout();

				if (!state.challenge) {
					throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
						context: { error: "Cannot submit, no Captcha found in state" },
					});
				}

				// hide the modal, no further input required from user
				updateState({ showModal: false });

				const challenge: CaptchaResponseBody = state.challenge;
				const salt = randomAsHex();

				// append solution to each captcha in the challenge
				const captchaSolution: CaptchaSolution[] = state.challenge.captchas.map(
					(captcha, index) => {
						const solution = at(state.solutions, index);
						return {
							captchaId: captcha.captchaId,
							captchaContentId: captcha.captchaContentId,
							salt,
							solution,
						};
					},
				);

				const account = getAccount();
				const signer = getExtension(account).signer;

				const first = at(challenge.captchas, 0);
				if (!first.datasetId) {
					throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_ID", {
						context: { error: "No datasetId set for challenge" },
					});
				}

				const captchaApi = state.captchaApi;

				if (!captchaApi) {
					throw new ProsopoError("CAPTCHA.INVALID_TOKEN", {
						context: { error: "No Captcha API found in state" },
					});
				}

				if (!signer || !signer.signRaw) {
					throw new ProsopoEnvError("GENERAL.CANT_FIND_KEYRINGPAIR", {
						context: {
							error:
								"Signer is not defined, cannot sign message to prove account ownership",
						},
					});
				}

				const userTimestampSignature = await signer.signRaw({
					address: account.account.address,
					data: stringToHex(challenge[ApiParams.timestamp]),
					type: "bytes",
				});

				// send the commitment to the provider
				const submission: TCaptchaSubmitResult =
					await captchaApi.submitCaptchaSolution(
						userTimestampSignature.signature,
						challenge.requestHash,
						captchaSolution,
						challenge.timestamp,
						challenge.signature.provider.requestHash,
					);

				// mark as is human if solution has been approved
				const isHuman = submission[0].verified;

				// update the state with the result of the submission
				updateState({
					submission,
					isHuman,
					loading: false,
				});
				if (state.isHuman) {
					const providerUrl = captchaApi.provider.provider.url;
					events.onHuman(
						encodeProcaptchaOutput({
							[ApiParams.providerUrl]: providerUrl,
							[ApiParams.user]: account.account.address,
							[ApiParams.dapp]: getDappAccount(),
							[ApiParams.commitmentId]: hashToHex(submission[1]),
							[ApiParams.timestamp]: challenge.timestamp,
							[ApiParams.signature]: {
								[ApiParams.provider]: {
									[ApiParams.requestHash]:
										challenge.signature.provider.requestHash,
								},
								[ApiParams.user]: {
									[ApiParams.timestamp]: userTimestampSignature.signature,
								},
							},
						}),
					);
					setValidChallengeTimeout();
				} else {
					events.onFailed();
					resetState(frictionlessState?.restart);
				}
			},
			start,
			resetState,
			state.attemptCount,
			10,
		);
	};

	const cancel = async () => {
		// disable the time limit
		clearTimeout();
		// abandon the captcha process and restart frictionless, if it exists
		resetState(frictionlessState?.restart);
		// trigger the onClose event
		events.onClose();
	};

	const reload = async () => {
		// disable the time limit
		clearTimeout();
		// trigger the onClose event
		events.onReload();
		// abandon the captcha process and restart frictionless, if it exists
		resetState(frictionlessState?.restart);
		if (!frictionlessState?.restart) {
			// start the captcha process again unless we need a new session
			await start();
		}
	};

	/**
	 * (De)Select an image from the solution for the current round. If the hash is already in the solutions list, it will be removed (deselected) and if not it will be added (selected).
	 * @param hash the hash of the image
	 */
	const select = (hash: string) => {
		if (!state.challenge) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: { error: "Cannot select, no Captcha found in state" },
			});
		}
		if (state.index >= state.challenge.captchas.length || state.index < 0) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: {
					error: "Cannot select, index is out of range for this Captcha",
				},
			});
		}
		const index = state.index;
		const solutions = state.solutions;
		const solution = at(solutions, index);
		if (solution.includes(hash)) {
			// remove the hash from the solution
			solution.splice(solution.indexOf(hash), 1);
		} else {
			// add the hash to the solution
			solution.push(hash);
		}
		updateState({ solutions });
	};

	/**
	 * Proceed to the next round of the challenge.
	 */
	const nextRound = () => {
		if (!state.challenge) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: { error: "Cannot select, no Captcha found in state" },
			});
		}
		if (state.index + 1 >= state.challenge.captchas.length) {
			throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
				context: {
					error: "Cannot select, index is out of range for this Captcha",
				},
			});
		}

		updateState({ index: state.index + 1 });
	};

	const loadProviderApi = async (providerUrl: string) => {
		const config = getConfig();
		if (!config.account.address) {
			throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
		}
		return new ProviderApi(providerUrl, config.account.address);
	};

	const clearTimeout = () => {
		// clear the timeout
		window.clearTimeout(Number(state.timeout));
		// then clear the timeout from the state
		updateState({ timeout: undefined });
	};

	const setValidChallengeTimeout = () => {
		const timeMillis: number = configOptional.captchas.image.solutionTimeout;
		const successfullChallengeTimeout = setTimeout(() => {
			// Human state expired, disallow user's claim to be human
			updateState({ isHuman: false });

			events.onExpired();
		}, timeMillis);

		updateState({ successfullChallengeTimeout });
	};

	const resetState = (frictionlessRestart?: () => void) => {
		// clear timeout just in case a timer is still active (shouldn't be)
		clearTimeout();
		updateState(defaultState());
		events.onReset();
		// reset the frictionless state if it exists
		if (frictionlessRestart) {
			frictionlessRestart();
		}
	};

	/**
	 * Load the account using address specified in config, or generate new address if not found in local storage for web2 mode.
	 */
	const loadAccount = async () => {
		const config = getConfig();
		// check if account has been provided in config (doesn't matter in web2 mode)
		if (!config.web2 && !config.userAccountAddress) {
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "Account address has not been set for web3 mode" },
			});
		}

		// check if account exists in extension
		const selectAccount = async () => {
			const ext = new (await ExtensionLoader(config.web2))();

			if (frictionlessState) {
				return frictionlessState.userAccount;
			}

			return await ext.getAccount(config);
		};

		const account = await selectAccount();

		updateState({ account });

		return getAccount();
	};

	const getAccount = () => {
		if (!state.account) {
			throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
				context: { error: "Account not loaded" },
			});
		}
		const account: Account = state.account;
		return account;
	};

	const getDappAccount = () => {
		if (!state.dappAccount) {
			throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
		}

		const dappAccount: string = state.dappAccount;
		return dappAccount;
	};

	const getExtension = (possiblyAccount?: Account) => {
		const account = possiblyAccount || getAccount();
		if (!account.extension) {
			throw new ProsopoEnvError("ACCOUNT.NO_POLKADOT_EXTENSION", {
				context: { error: "Extension not loaded" },
			});
		}

		return account.extension;
	};

	return {
		start,
		cancel,
		submit,
		select,
		nextRound,
		reload,
	};
}
