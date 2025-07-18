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

import type { i18n } from "i18next";
let i18nInstance: i18n;
async function loadI18next(backend: boolean): Promise<i18n> {
	return new Promise((resolve, reject) => {
		try {
			if (backend) {
				import("./i18nBackend.js").then(({ default: initializeI18n }) => {
					if (!i18nInstance) {
						// pass the resolver into the i18n init fn which will resolve after i18n connected fires
						i18nInstance = initializeI18n(resolve);
					} else {
						// we've already initialised i18n so just return it
						resolve(i18nInstance);
					}
				});
			} else {
				import("./i18nFrontend.js").then(({ default: initializeI18n }) => {
					if (!i18nInstance) {
						// pass the resolver into the i18 init fn which will resolve after i18 connected fires
						i18nInstance = initializeI18n(resolve);
					} else {
						// we've already initialised i18n so just return it
						resolve(i18nInstance);
					}
				});
			}
		} catch (e) {
			reject(e);
		}
	});
}

export type { i18n as Ti18n };

export default loadI18next;
