'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { isHostedPageContent, type TPublicHostedPageResponseDto } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useHostedAssetUrlsQuery } from '@/lib/api/hosted-page';
import { hostedTemplateAssetUrls, resolveActiveTemplate } from '@/components/hosted-page/preview';
import { previewOf } from '@/components/hosted-page/registry';

/**
 * Public URLs for the image keys in the editor: known from this session's uploads, or, for images
 * of a saved code, asked from the owner's account (never from the public page, which may be off).
 */
export function useHostedAssetUrls(): Record<string, string> {
	const { hostedAssetUrls, content } = useQrCodeGeneratorStore((state) => state);
	const hosted = isHostedPageContent(content) ? content : null;
	const unknown = (hosted ? previewOf(hosted.type).imageKeys(hosted.data) : [])
		.filter((key) => !hostedAssetUrls?.[key])
		.sort();
	const saved = useHostedAssetUrlsQuery(unknown);

	return useMemo(() => ({ ...saved.data, ...hostedAssetUrls }), [saved.data, hostedAssetUrls]);
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
