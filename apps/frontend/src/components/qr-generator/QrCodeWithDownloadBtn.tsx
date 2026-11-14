import { Suspense } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import QrCodeSaveTemplateBtn from './templates/SaveTemplateBtn';
import { GeneratorQrCodeDownloadBtn } from './download-buttons';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import SaveQrCodeBtn from './SaveQrCodeBtn';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { HostedPreviewSwitch } from './HostedPreviewSwitch';
import { showsLandingPage } from '@shared/schemas';

export const QrCodeWithDownloadBtn = () => {
	const { config, content, bulkMode, hostedPreviewView } = useQrCodeGeneratorStore(
		(state) => state,
	);
	// while the landing page is shown, downloading the QR image or saving its design makes no sense
	const pageView = hostedPreviewView === 'page' && showsLandingPage(content);
	const { data: shortUrl } = useGetReservedShortUrlQuery();
	const { hasProPlan } = useHasProPlan();

	return (
		<div className="md:sticky md:top-24 md:self-start">
			<Suspense fallback={null}>
				<div className="flex justify-center space-y-6 lg:flex-col lg:justify-start">
					<HostedPreviewSwitch>
						<DynamicQrCode
							qrCode={{
								content,
								config,
							}}
							shortUrl={shortUrl || undefined}
							hasProPlan={hasProPlan}
						/>
					</HostedPreviewSwitch>
				</div>
				{!bulkMode.isBulkMode && (
					<div className="mt-6 flex justify-center flex-col space-y-2 mb-3">
						{!pageView && <GeneratorQrCodeDownloadBtn saveOnDownload={true} />}
						<SaveQrCodeBtn
							qrCode={{
								name: null,
								content,
								config,
							}}
						/>
					</div>
				)}
				{!pageView && (
					<div className={`text-center ${bulkMode.isBulkMode && 'mt-4'}`}>
						<QrCodeSaveTemplateBtn config={config} />
					</div>
				)}
			</Suspense>
		</div>
	);
};
