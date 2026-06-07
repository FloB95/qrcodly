import { Suspense, useMemo } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import QrCodeSaveTemplateBtn from './templates/SaveTemplateBtn';
import { GeneratorQrCodeDownloadBtn } from './download-buttons';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import SaveQrCodeBtn from './SaveQrCodeBtn';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';
import { useHasProPlan } from '@/hooks/useHasProPlan';

export const QrCodeWithDownloadBtn = () => {
	const { config, content, bulkMode, customDomainId, customSlug } = useQrCodeGeneratorStore(
		(state) => state,
	);
	const { data: shortUrl } = useGetReservedShortUrlQuery();
	const { hasProPlan } = useHasProPlan();

	// Apply the user's pre-save overrides (from the dynamic-QR settings dialog)
	// to the displayed short URL so the preview shows what the user is about to
	// commit. The actual write happens in SaveQrCodeBtn.
	const previewShortUrl = useMemo(() => {
		if (!shortUrl) return undefined;
		const overrideDomainId =
			customDomainId === undefined ? shortUrl.customDomainId : customDomainId;
		const overrideSlug = customSlug ?? shortUrl.customSlug ?? null;
		return { ...shortUrl, customDomainId: overrideDomainId, customSlug: overrideSlug };
	}, [shortUrl, customDomainId, customSlug]);

	return (
		<div>
			<Suspense fallback={null}>
				<div className="flex justify-center space-y-6 lg:flex-col lg:justify-start">
					<DynamicQrCode
						qrCode={{
							content,
							config,
						}}
						shortUrl={previewShortUrl}
						hasProPlan={hasProPlan}
					/>
				</div>
				{!bulkMode.isBulkMode && (
					<div className="mt-6 flex justify-center flex-col space-y-2 mb-3">
						<GeneratorQrCodeDownloadBtn saveOnDownload={true} />
						<SaveQrCodeBtn
							qrCode={{
								name: null,
								content,
								config,
							}}
						/>
					</div>
				)}
				<div className={`text-center ${bulkMode.isBulkMode && 'mt-4'}`}>
					<QrCodeSaveTemplateBtn config={config} />
				</div>
			</Suspense>
		</div>
	);
};
