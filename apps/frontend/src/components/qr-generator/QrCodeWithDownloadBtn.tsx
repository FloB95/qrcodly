import { Suspense } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import QrCodeSaveTemplateBtn from './templates/SaveTemplateBtn';
import QrCodeDownloadBtn from './QrCodeDownloadBtn';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';

export const QrCodeWithDownloadBtn = () => {
	const { config, content } = useQrCodeGeneratorStore((state) => state);
	return (
		<div>
			<Suspense fallback={null}>
				<div className="flex justify-center space-y-6 md:flex-col md:justify-start">
					<DynamicQrCode
						qrCode={{
							content,
							config,
						}}
					/>
				</div>
				<div className="mt-6 flex justify-center space-x-2 md:justify-between">
					<QrCodeSaveTemplateBtn config={config} />
					<QrCodeDownloadBtn
						qrCode={{
							content,
							config,
						}}
						saveOnDownload={true}
					/>
				</div>
			</Suspense>
		</div>
	);
};
