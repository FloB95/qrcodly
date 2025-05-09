import { Suspense } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import QrCodeSaveTemplateBtn from './templates/SaveTemplateBtn';
import QrCodeDownloadBtn from './QrCodeDownloadBtn';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import SaveQrCodeBtn from './SaveQrCodeBtn';

export const QrCodeWithDownloadBtn = () => {
	const { config, content } = useQrCodeGeneratorStore((state) => state);
	return (
		<div>
			<Suspense fallback={null}>
				<div className="flex justify-center space-y-6 lg:flex-col lg:justify-start">
					<DynamicQrCode
						qrCode={{
							content,
							config,
						}}
					/>
				</div>
				<div className="mt-6 flex justify-center lg:space-x-2 flex-col space-y-2 lg:space-y-0 lg:flex-row lg:justify-between mb-3">
					<SaveQrCodeBtn
						qrCode={{
							name: null,
							content,
							config,
						}}
					/>
					<QrCodeDownloadBtn
						qrCode={{
							name: null,
							content,
							config,
						}}
						saveOnDownload={true}
					/>
				</div>
				<div className="text-center">
					<QrCodeSaveTemplateBtn config={config} />
				</div>
			</Suspense>
		</div>
	);
};
