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

import fs from "node:fs";
import path from "node:path";
import { env } from "node:process";
import { at, get } from "@prosopo/util";
import fg from "fast-glob";
import z from "zod";

export const engines = async () => {
	const pkgJsonPath = z.string().parse(process.argv[2]);
	console.log("Checking", pkgJsonPath);
	// read the pkg json file
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
	// only accept workspace pkg json
	if (pkgJson.workspaces === undefined) {
		throw new Error(`${pkgJsonPath} is not a workspace`);
	}

	const enginesSchema = z.object({
		node: z.string(),
		npm: z.string(),
	});
	const engines = enginesSchema.parse(pkgJson.engines);

	// for each package in the workspace, check their version matches the workspace version
	const globs = z
		.string()
		.array()
		.parse(pkgJson.workspaces)
		.map((g) => `${path.dirname(pkgJsonPath)}/${g}/package.json`);
	const pkgJsonPaths = fg.globSync(globs);
	for (const pkgJsonPath of pkgJsonPaths) {
		console.log("Checking", pkgJsonPath);
		const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
		const pkgEngine = enginesSchema.parse(pkgJson.engines);
		if (pkgEngine.node !== engines.node) {
			throw new Error(
				`${pkgJsonPath} has node version ${pkgEngine.node}, should be ${engines.node}`,
			);
		}
		if (pkgEngine.npm !== engines.npm) {
			throw new Error(
				`${pkgJsonPath} has npm version ${pkgEngine.npm}, should be ${engines.npm}`,
			);
		}
	}
};
