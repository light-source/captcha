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

import { describe, expect, test } from "vitest";
import { userScopeInputSchema } from "#policy/accessPolicy.js";

describe("accessPolicy", () => {
	describe("userScopeInputSchema", () => {
		test("turns ip into numericIp", () => {
			const userScope = userScopeInputSchema.parse({
				ip: "127.0.0.1",
				numericIp: "123",
			});

			expect(userScope).toEqual({
				numericIp: BigInt(2130706433),
			});
		});

		test("turns ipMask into numericIpMask", () => {
			const userScope = userScopeInputSchema.parse({
				ipMask: "127.0.0.1/24",
				numericIpMaskMin: 1,
				numericIpMaskMax: 2,
			});

			expect(userScope).toEqual({
				numericIpMaskMin: BigInt(2130706432),
				numericIpMaskMax: BigInt(2130706687),
			});
		});
	});
});
