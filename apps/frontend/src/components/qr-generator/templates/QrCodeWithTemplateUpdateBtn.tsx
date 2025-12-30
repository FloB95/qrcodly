import { Suspense } from 'react';
import { DynamicQrCode } from '../DynamicQrCode';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import UpdateTemplateBtn from './UpdateTemplateBtn';

export const QrCodeWithTemplateUpdateBtn = () => {
	const { id, name, config, content, shortUrl } = useQrCodeGeneratorStore((state) => state);
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
				<div className="mt-6 flex justify-center flex-col space-y-2 mb-3">
					<UpdateTemplateBtn
						configTemplate={{
							id: id!,
							name: name ?? '',
							config,
						}}
					/>
				</div>
			</Suspense>
		</div>
	);
};
