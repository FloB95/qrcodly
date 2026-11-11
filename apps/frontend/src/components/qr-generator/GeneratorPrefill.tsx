'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTemplatesForType, isHostedPageType } from '@shared/schemas';
import { usePathname, useRouter } from '@/i18n/navigation';
import { freshHostedDraft } from '@/lib/hosted-draft';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';

/**
 * Landing pages link to the generator with a hosted page type: `template` picks and adopts that
 * template (`/?type=product&template=machineManual#generator`), `sample` only shows it as the
 * preview's example. The parameters are applied once and then dropped from the address, so a
 * reload keeps whatever the visitor changed since.
 */
export function GeneratorPrefill() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const {
		updateContent,
		setHostedSampleTemplate,
		setHostedPreviewView,
		setHostedTemplate,
		setHostedTemplateRequest,
	} = useQrCodeGeneratorStore((state) => state);

	useEffect(() => {
		const type = searchParams.get('type');
		if (!type || !isHostedPageType(type)) return;
		const requested = searchParams.get('template');
		const template = getTemplatesForType(type).find((entry) => entry.id === requested)?.id ?? null;
		const draft = freshHostedDraft(type, template ?? searchParams.get('sample'));
		setHostedTemplate(null);
		updateContent(draft.content);
		// a picked template is adopted by the editor once it is mounted; until then no sample shows
		setHostedSampleTemplate(template ? null : draft.sampleTemplate);
		setHostedTemplateRequest(template);
		setHostedPreviewView('page');
		router.replace(`${pathname}#generator`, { scroll: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	return null;
}
