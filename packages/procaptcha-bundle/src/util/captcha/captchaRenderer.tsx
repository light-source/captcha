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

import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import type { Ti18n } from "@prosopo/locale";
import type {
	Callbacks,
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import type { CaptchaType } from "@prosopo/types";
import type { ReactNode } from "react";
import { type Root, createRoot } from "react-dom/client";
import { createConfig } from "../configCreator.js";
import { setLanguage } from "../language.js";
import { setValidChallengeLength } from "../timeout.js";
import type { CaptchaComponentProvider } from "./captchaComponentProvider.js";

interface RenderSettings {
	identifierPrefix: string;
	emotionCacheKey: string;
	webComponentTag: string;
	defaultCaptchaType: CaptchaType;
}

class CaptchaRenderer {
	private readonly captchaComponentProvider: CaptchaComponentProvider;

	constructor(captchaComponentProvider: CaptchaComponentProvider) {
		this.captchaComponentProvider = captchaComponentProvider;
	}

	public renderCaptcha(
		settings: RenderSettings,
		container: HTMLElement,
		renderOptions: ProcaptchaRenderOptions,
		callbacks: Callbacks,
		isWeb2: boolean,
		i18n: Ti18n,
		invisible = false,
	): Root {
		const captchaType =
			(renderOptions?.captchaType as CaptchaType) ||
			settings.defaultCaptchaType;

		const config = createConfig(
			renderOptions.siteKey,
			renderOptions.theme,
			renderOptions.language,
			isWeb2,
			invisible,
			renderOptions.userAccountAddress,
		);
		this.readAndValidateSettings(container, config, renderOptions);

		const reactRoot = this.createReactRoot(
			container,
			settings.identifierPrefix,
		);

		const emotionCache = this.makeEmotionCache(
			settings.emotionCacheKey,
			container,
		);

		const captchaComponent = this.captchaComponentProvider.getCaptchaComponent(
			captchaType,
			{
				config: config,
				i18n: i18n,
				callbacks,
			},
		);

		this.renderCaptchaComponent(reactRoot, emotionCache, captchaComponent);

		return reactRoot;
	}

	protected readAndValidateSettings(
		element: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions: ProcaptchaRenderOptions,
	): void {
		setValidChallengeLength(renderOptions, element, config);
		setLanguage(renderOptions, element, config);
	}

	protected makeEmotionCache(
		cacheKey: string,
		container: HTMLElement,
	): EmotionCache {
		return createCache({
			key: cacheKey,
			prepend: true,
			container: container,
		});
	}

	protected createReactRoot(
		container: HTMLElement,
		identifierPrefix: string,
	): Root {
		return createRoot(container, {
			identifierPrefix: identifierPrefix,
		});
	}

	protected renderCaptchaComponent(
		reactRoot: Root,
		emotionCache: EmotionCache,
		captchaComponent: ReactNode,
	): void {
		reactRoot.render(
			<CacheProvider value={emotionCache}>{captchaComponent}</CacheProvider>,
		);
	}
}

export { CaptchaRenderer };
