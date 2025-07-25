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

import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, ProsopoApiError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { validateAddress } from "@prosopo/util-crypto";
import type { NextFunction, Request, Response } from "express";
import type { TFunction } from "i18next";
import { ZodError } from "zod";
import { Tasks } from "../tasks/index.js";

export const domainMiddleware = (env: ProviderEnvironment) => {
	const tasks = new Tasks(env);

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const dapp = req.headers["prosopo-site-key"] as string;
			if (!dapp)
				throw siteKeyNotRegisteredError(
					req.i18n,
					"No sitekey provided",
					req.logger,
				);

			try {
				validateAddress(dapp, false, 42);
			} catch (err) {
				throw invalidSiteKeyError(req.i18n, dapp, req.logger);
			}

			const clientSettings = await tasks.db.getClientRecord(dapp);
			if (!clientSettings)
				throw siteKeyNotRegisteredError(req.i18n, dapp, req.logger);

			const allowedDomains = clientSettings.settings?.domains;
			if (!allowedDomains)
				throw siteKeyInvalidDomainError(
					req.i18n,
					dapp,
					req.hostname,
					req.logger,
				);

			const origin = req.headers.origin;
			if (!origin)
				throw unauthorizedOriginError(req.i18n, undefined, req.logger);

			for (const domain of allowedDomains) {
				if (tasks.clientTaskManager.isSubdomainOrExactMatch(origin, domain)) {
					next();
					return;
				}
			}

			throw unauthorizedOriginError(req.i18n, origin, req.logger);
		} catch (err) {
			if (
				err instanceof ProsopoApiError ||
				err instanceof ZodError ||
				err instanceof SyntaxError
			) {
				handleErrors(err, req, res, next);
			} else {
				res.status(401).json({ error: "Unauthorized", message: err });
				return;
			}
		}
	};
};

const siteKeyNotRegisteredError = (
	i18n: { t: TFunction<"translation", undefined> },
	dapp: string,
	logger?: Logger,
) => {
	return new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
		context: { code: 400, siteKey: dapp },
		i18n,
		logger,
	});
};

const invalidSiteKeyError = (
	i18n: { t: TFunction<"translation", undefined> },
	siteKey: string,
	logger?: Logger,
) => {
	return new ProsopoApiError("API.INVALID_SITE_KEY", {
		context: { code: 400, siteKey: siteKey },
		i18n,
		logger,
	});
};

const unauthorizedOriginError = (
	i18n: { t: TFunction<"translation", undefined> },
	origin?: string,
	logger?: Logger,
) => {
	return new ProsopoApiError("API.UNAUTHORIZED_ORIGIN_URL", {
		context: { code: 400, origin },
		i18n,
		logger,
	});
};

const siteKeyInvalidDomainError = (
	i18n: { t: TFunction<"translation", undefined> },
	dapp: string,
	domain: string,
	logger?: Logger,
) => {
	return new ProsopoApiError("API.UNAUTHORIZED_ORIGIN_URL", {
		context: {
			code: 400,
			message:
				"No domains are allowed for this site key. Please fix in the Procaptcha Portal",
			siteKey: dapp,
			domain,
		},
		i18n,
		logger,
	});
};
