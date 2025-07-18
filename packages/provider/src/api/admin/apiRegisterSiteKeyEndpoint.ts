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

import {
	type ApiEndpoint,
	type ApiEndpointResponse,
	ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import { type Logger, getLogger } from "@prosopo/common";
import { ClientSettingsSchema, RegisterSitekeyBody } from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

type RegisterSitekeyBodyType = typeof RegisterSitekeyBody;

class ApiRegisterSiteKeyEndpoint
	implements ApiEndpoint<RegisterSitekeyBodyType>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: z.infer<RegisterSitekeyBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		const { siteKey, tier, settings } = args;

		logger = logger || getLogger("info", import.meta.url);

		const temp = settings || ClientSettingsSchema.parse({});

		logger.info(() => ({ data: { siteKey }, msg: "`Registering site key" }));

		await this.clientTaskManager.registerSiteKey(siteKey, tier, temp);

		logger.info(() => ({ msg: "Site key registered" }));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
		};
	}

	public getRequestArgsSchema(): RegisterSitekeyBodyType {
		return RegisterSitekeyBody;
	}
}

export { ApiRegisterSiteKeyEndpoint };
