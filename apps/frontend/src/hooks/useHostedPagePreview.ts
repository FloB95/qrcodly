'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { isHostedPageContent, type TPublicHostedPageResponseDto } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useHostedAssetUrlsQuery } from '@/lib/api/hosted-page';
import {
	hostedTemplateAssetUrls,
	parseTemplateImageKey,
	resolveActiveTemplate,
	templateImageUrl,
} from '@/components/hosted-page/preview';
import { previewOf } from '@/components/hosted-page/registry';

/**
 * Public URLs for the image keys in the editor: known from this session's uploads, or, for images
 * of a saved code, asked from the owner's account (never from the public page, which may be off).
 * An adopted template's images are still the shipped files until the page is saved.
 */
export function useHostedAssetUrls(): Record<string, string> {
	const { hostedAssetUrls, content } = useQrCodeGeneratorStore((state) => state);
	const hosted = isHostedPageContent(content) ? content : null;
	const keys = hosted ? previewOf(hosted.type).imageKeys(hosted.data) : [];
	const unknown = keys
		.filter((key) => !hostedAssetUrls?.[key] && !parseTemplateImageKey(key))
		.sort();
	const saved = useHostedAssetUrlsQuery(unknown);
	const templateKeys = keys.filter((key) => parseTemplateImageKey(key)).join(',');

	return useMemo(() => {
		const shipped = Object.fromEntries(
			templateKeys.split(',').flatMap((key) => {
				const image = parseTemplateImageKey(key);
				return image ? [[key, templateImageUrl(image.id, image.slot)]] : [];
			}),
		);
		return { ...saved.data, ...hostedAssetUrls, ...shipped };
	}, [saved.data, hostedAssetUrls, templateKeys]);
}

type HostedPreview = {
	/** What the scanner would see for the content in the editor, or null for non-hosted content */
	page: TPublicHostedPageResponseDto | null;
	/** True while the page shows a template's sample content instead of the owner's */
	isSample: boolean;
};

export function useHostedPagePreview(): HostedPreview {
	const { content, shortUrl, hostedSampleTemplate, hostedTemplate } = useQrCodeGeneratorStore(
		(state) => state,
	);
	const { hasProPlan } = useHasProPlan();
	const assetUrls = useHostedAssetUrls();
	const t = useTranslations('generator.contentSwitch.hosted.templates');

	return useMemo(() => {
		if (!isHostedPageContent(content)) return { page: null, isSample: false };
		const preview = previewOf(content.type);

		if (hostedSampleTemplate && preview.isUntouched(content.data)) {
			return {
				page: preview.build(preview.sample(content.data, t, hostedSampleTemplate), {
					hasProPlan: true,
					assetUrls: hostedTemplateAssetUrls(hostedSampleTemplate),
				}),
				isSample: true,
			};
		}

		const template = resolveActiveTemplate(hostedTemplate, content.data.theme);
		const data = template ? preview.withPlaceholders(content.data, t, template) : content.data;
		return {
			page: preview.build(data, { hasProPlan, shortCode: shortUrl?.shortCode, assetUrls }),
			isSample: false,
		};
	}, [
		content,
		hasProPlan,
		shortUrl?.shortCode,
		assetUrls,
		hostedSampleTemplate,
		hostedTemplate,
		t,
	]);
}
