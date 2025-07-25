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

import path from "node:path";
import i18n from "i18next";
import FSBackend from "i18next-fs-backend/cjs"; // https://github.com/i18next/i18next-fs-backend/issues/57
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import { i18nSharedOptions } from "./i18SharedOptions.js";
import { isServerSide } from "./util.js";

const loadPath =
	`${path.dirname(import.meta.url)}/locales/{{lng}}/{{ns}}.json`.replace(
		"file://",
		"",
	);

export function initializeI18n(
	i18nLoadedCallback?: (value: typeof i18n) => void,
) {
	if (!i18n.isInitialized && isServerSide()) {
		const lngDetector = new MiddlewareLanguageDetector(null, {
			order: ["header", "query", "cookie"],
		});
		i18n
			// @ts-ignore https://github.com/i18next/i18next-fs-backend/issues/57
			.use(FSBackend)
			.use(lngDetector) // this line should switch the language to the one the user reports in the Accept-Language header
			.init({
				...i18nSharedOptions,
				ns: ["translation"],
				backend: {
					loadPath,
				},
			});
		i18n.on("loaded", () => {
			i18nLoadedCallback?.(i18n);
		});
	}
	return i18n;
}

export default initializeI18n;
