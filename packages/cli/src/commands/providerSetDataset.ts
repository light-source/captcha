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

import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { ArgumentsCamelCase, Argv } from "yargs";
import * as z from "zod";
import { loadJSONFile } from "../files.js";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger ||
		getLogger(LogLevel.enum.info, "cli.provider_set_data_set");

	return {
		command: "provider_set_data_set",
		describe: "Add a dataset as a Provider",
		builder: (yargs: Argv) =>
			yargs.option("file", {
				type: "string" as const,
				demand: true,
				desc: "The file path of a JSON dataset file",
			} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const env = new ProviderEnvironment(config, pair);
				await env.isReady();
				const tasks = new Tasks(env);
				const file = z.string().parse(argv.file);
				const jsonFile = loadJSONFile(file) as JSON;
				logger.info(() => ({
					data: { file },
					msg: "Loading JSON",
				}));
				const result =
					await tasks.datasetManager.providerSetDatasetFromFile(jsonFile);
				logger.info(() => ({
					data: { file },
					msg: "Loaded JSON",
				}));
			} catch (err) {
				logger.error(() => ({
					err,
					msg: "Error loading JSON",
				}));
			}
		},
		middlewares: [],
	};
};
