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
const getWebpackConfig = require("@prosopo/config/webpack/webpack.config");
const path = require("node:path");
const fg = require("fast-glob");
const args = process.argv.slice(2);
const mode =
	args.indexOf("--mode") > -1
		? args[args.indexOf("--mode") + 1]
		: "development";
const webpackConfig = getWebpackConfig(mode);

const rootDir = path.resolve(__dirname, "../..");
console.log("Looking in", rootDir);

const nodeModulePaths = fg.sync("**/node_modules", {
	onlyDirectories: true,
	cwd: rootDir,
});

console.log(nodeModulePaths);

const bundleWebpackConfig = {
	...webpackConfig,
	resolve: {
		...webpackConfig.resolve,
		modules: nodeModulePaths,
		alias: {
			"@polkadot/x-textdecoder": path.resolve(
				"../../node_modules/@polkadot/x-textdecoder",
			),
			"@polkadot/x-textencoder": path.resolve(
				"../../node_modules/@polkadot/x-textencoder",
			),
		},
	},
	externals: {
		...webpackConfig.externals,
		"node:crypto": "commonjs crypto",
		"node:util": "commonjs util",
	},
};
console.log(bundleWebpackConfig);
module.exports = bundleWebpackConfig;
