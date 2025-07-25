import { ProviderApi } from "@prosopo/api";
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
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
import type { KeyringPair } from "@prosopo/types";
import {
	CaptchaTypeSpec,
	type ProsopoConfigOutput,
	Tier,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { z } from "zod";
import { SiteKeyRegisterCommandArgsSpec } from "./siteKeyRegister.js";
import { validateSiteKey } from "./validators.js";

const SiteKeyRegisterApiCommandArgsSpec = SiteKeyRegisterCommandArgsSpec.extend(
	{
		url: z.string(),
	},
);

export default (
	pair: KeyringPair,
	authAccount: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger || getLogger(LogLevel.enum.info, "cli.dapp_register");

	return {
		command: "site_key_register_api <sitekey> <url>",
		describe: "Register a Site Key",
		builder: (yargs: Argv) =>
			yargs
				.positional("sitekey", {
					type: "string" as const,
					demandOption: true,
					desc: "The AccountId of the application to register the Site Key with",
				} as const)
				.positional("tier", {
					choices: Object.values(Tier),
					demandOption: true,
					desc: "The tier of the account",
				} as const)
				.option("url", {
					type: "string" as const,
					demandOption: true,
					desc: "Provider URL to register the Site Key with",
				} as const)
				.option("captcha_type", {
					type: "string" as const,
					demandOption: false,
					desc: "Captcha type for settings",
				} as const)
				.option("frictionless_threshold", {
					type: "number" as const,
					demandOption: false,
					desc: "Frictionless threshold for settings",
				} as const)
				.option("domains", {
					type: "array" as const,
					demandOption: false,
					desc: "URLs for settings",
				} as const)
				.option("pow_difficulty", {
					type: "number" as const,
					demandOption: false,
					desc: "POW difficulty for settings",
				} as const)
				.option("image_threshold", {
					type: "number" as const,
					demandOption: false,
					desc: "Image threshold for settings",
				} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const env = new ProviderEnvironment(config, pair, authAccount);
				await env.isReady();
				const {
					sitekey,
					captcha_type,
					frictionless_threshold,
					url,
					domains,
					pow_difficulty,
					image_threshold,
				} = SiteKeyRegisterApiCommandArgsSpec.parse(argv);
				const api = new ProviderApi(url as string, pair.address);
				const timestamp = new Date().getTime().toString();
				const signature = u8aToHex(authAccount.sign(timestamp));
				await api.registerSiteKey(
					sitekey as string,
					argv.tier as Tier,
					{
						captchaType: CaptchaTypeSpec.parse(captcha_type),
						frictionlessThreshold: frictionless_threshold as number,
						domains: domains || [],
						powDifficulty: pow_difficulty as number,
						imageThreshold: image_threshold as number,
					},
					timestamp,
					signature,
				);
				logger.info(() => ({
					data: { sitekey },
					msg: "Site Key registered",
				}));
			} catch (err) {
				logger.error(() => ({
					err,
					msg: "Error registering Site Key",
				}));
			}
		},
		middlewares: [validateSiteKey],
	};
};
