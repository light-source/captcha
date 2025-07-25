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

import { CaptchaType } from "@prosopo/types";
import type { ReactNode } from "react";
import { captchaComponentsList } from "./captchaComponentsList.js";
import type { CaptchaProps } from "./captchaProps.js";

class CaptchaComponentProvider {
	public getCaptchaComponent(
		captchaType: CaptchaType,
		captchaProps: CaptchaProps,
	): ReactNode {
		if (captchaType === CaptchaType.invisible) {
			throw new Error("Not Implemented");
		}

		const CaptchaComponent = captchaComponentsList[captchaType];

		console.log(`rendering ${captchaType}`);

		return (
			<CaptchaComponent
				config={captchaProps.config}
				callbacks={captchaProps.callbacks}
				i18n={captchaProps.i18n}
			/>
		);
	}
}

export { CaptchaComponentProvider };
