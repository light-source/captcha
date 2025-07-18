import fs from "node:fs";
import path from "node:path";
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import type { ArgumentsCamelCase, Argv } from "yargs";
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
import * as z from "zod";
import { formatEnvToArray } from "../lib/formatEnv.js";

const fluxFormatEnvArgs = z.object({
	file: z.string(),
	write: z.string().optional(),
});
export default (cmdArgs?: { logger?: Logger }) => {
	const logger =
		cmdArgs?.logger || getLogger(LogLevel.enum.info, "flux.cli.getDapp");

	return {
		command: "formatenv <file>",
		describe: "Format an environment file to an array",
		builder: (yargs: Argv) =>
			yargs
				.positional("file", {
					type: "string" as const,
					demandOption: false,
					desc: "Name of the dapp to get the details of",
				} as const)
				.option("--write", {
					type: "string" as const,
					demandOption: false,
					desc: "Write the formatted env to a file",
				} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const parsedArgs = fluxFormatEnvArgs.parse(argv);

				const formattedEnv = formatEnvToArray(parsedArgs.file);

				logger.info(() => ({ data: { formattedEnv }, msg: "Formatted env" }));

				if (parsedArgs.write) {
					const writePath = path.resolve(parsedArgs.write);
					fs.writeFileSync(writePath, formattedEnv);
					logger.info(() => ({
						data: { writePath },
						msg: "Formatted env written to",
					}));
				}
			} catch (err) {
				logger.error(() => ({ err }));
			}
		},
		middlewares: [],
	};
};
