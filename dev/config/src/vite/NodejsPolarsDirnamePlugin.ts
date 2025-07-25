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

export const nodejsPolarsDirnamePlugin = () => {
	const name = "nodejs-polars-dirname-plugin";
	return {
		name,
		// biome-ignore lint/suspicious/noExplicitAny: TODO not sure of options type
		resolveId(source: string, importer: string | undefined, options: any) {
			// aim for the node_modules/nodejs-polars/bin/native-polars.js file
			if (source.endsWith("nodejs-polars/bin/native-polars.js")) {
				console.debug(name, "resolves", source, "imported by", importer);
				// return the source to indicate this plugin can resolve the import
				return source;
			}
			// return null if this plugin can't resolve the import
			return null;
		},
		transform(code: string, id: string) {
			// aim for the node_modules/nodejs-polars/bin/native-polars.js file
			if (id.endsWith("nodejs-polars/bin/native-polars.js")) {
				// replace all instances of __dirname with the path relative to the output bundle
				console.debug(name, "transform", id);
				const newCode = code.replaceAll(
					"__dirname",
					`new URL(import.meta.url).pathname.split('/').slice(0,-1).join('/')`,
				);
				return newCode;
			}
			// else return the original code (leave code unrelated to nodejs-polars untouched)
			return code;
		},
	};
};
