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

import { ProviderEnvironment } from "@prosopo/env";
import type { KeyringPair } from "@prosopo/types";
import { type ProsopoConfigOutput, ScheduledTaskNames } from "@prosopo/types";
import { CronJob } from "cron";
import { Tasks } from "../tasks/tasks.js";
import { checkIfTaskIsRunning } from "../util.js";

export async function storeCaptchasExternally(
	pair: KeyringPair,
	cronSchedule: string,
	config: ProsopoConfigOutput,
) {
	const env = new ProviderEnvironment(config, pair);
	await env.isReady();

	const tasks = new Tasks(env);

	const job = new CronJob(cronSchedule, async () => {
		const taskRunning = await checkIfTaskIsRunning(
			ScheduledTaskNames.StoreCommitmentsExternal,
			env.getDb(),
		);
		env.logger.info(() => ({
			data: { taskRunning },
			msg: `${ScheduledTaskNames.StoreCommitmentsExternal} task running: ${taskRunning}`,
		}));
		if (!taskRunning) {
			env.logger.info(() => ({
				msg: `${ScheduledTaskNames.StoreCommitmentsExternal} task....`,
			}));
			await tasks.clientTaskManager.storeCommitmentsExternal().catch((err) => {
				env.logger.error(() => ({
					err,
					msg: "Error storing commitments externally",
				}));
			});
		}
	});

	job.start();
}
