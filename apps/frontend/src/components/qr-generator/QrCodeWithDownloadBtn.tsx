import { Suspense } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import QrCodeSaveTemplateBtn from './templates/SaveTemplateBtn';
import { GeneratorQrCodeDownloadBtn } from './download-buttons';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import SaveQrCodeBtn from './SaveQrCodeBtn';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';

export const QrCodeWithDownloadBtn = () => {
	const { config, content, bulkMode } = useQrCodeGeneratorStore((state) => state);
	const { data: shortUrl } = useGetReservedShortUrlQuery();
	return (
		<div>
			<Suspense fallback={null}>
				<div className="flex justify-center space-y-6 lg:flex-col lg:justify-start">
					<DynamicQrCode
						qrCode={{
							content,
							config,
						}}
						shortUrl={shortUrl || undefined}
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
