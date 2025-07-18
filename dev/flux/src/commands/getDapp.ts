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
import { FLUX_URL, getAuth, getIndividualFluxAppDetails } from "../lib/auth.js";
import { getPrivateKey, getPublicKey } from "./process.env.js";
const fluxGetDappArgs = z.object({
	app: z.string(),
	nodes: z.boolean().optional(),
});
export default (cmdArgs?: { logger?: Logger }) => {
	const logger =
		cmdArgs?.logger || getLogger(LogLevel.enum.info, "flux.cli.getDapp");

	return {
		command: "getDapp <app>",
		describe: "Get dapp details",
		builder: (yargs: Argv) =>
			yargs
				.positional("app", {
					type: "string" as const,
					demandOption: false,
					desc: "Name of the dapp to get the details of",
				} as const)
				.option("--nodes", {
					type: "boolean" as const,
					demandOption: false,
					desc: "Return node details only",
				} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const privateKey = getPrivateKey();
				const publicKey = getPublicKey();
				const { signature, loginPhrase } = await getAuth(privateKey, FLUX_URL);
				const parsedArgs = fluxGetDappArgs.parse(argv);
				const dapp = await getIndividualFluxAppDetails(
					parsedArgs.app,
					publicKey,
					signature,
					loginPhrase,
				);
				if (parsedArgs.nodes) {
					logger.info(() => ({ data: { nodes: dapp.nodes } }));
					return;
				}
				logger.info(() => ({ data: { dapp } }));
			} catch (err) {
				logger.error(() => ({ err }));
			}
		},
		middlewares: [],
	};
};
