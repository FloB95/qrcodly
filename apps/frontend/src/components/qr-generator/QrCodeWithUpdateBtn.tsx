import { Suspense } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import UpdateQrCodeBtn from './UpdateQrCodeBtn';
import { HostedPreviewSwitch } from './HostedPreviewSwitch';

export const QrCodeWithUpdateBtn = () => {
	const { id, name, config, content, shortUrl } = useQrCodeGeneratorStore((state) => state);

	return (
		<div className="md:sticky md:top-24 md:self-start">
			<Suspense fallback={null}>
				<div className="flex justify-center space-y-6 lg:flex-col lg:justify-start">
					<HostedPreviewSwitch>
						<DynamicQrCode
							hideDomainEdit
							qrCode={{
								content,
								config,
							}}
							shortUrl={shortUrl || undefined}
						/>
					</HostedPreviewSwitch>
				</div>
				<div className="mt-6 flex justify-center flex-col space-y-2 mb-3">
					<UpdateQrCodeBtn
						qrCode={{
							id: id!,
							name: name || null,
							content,
							config,
							shortUrl: shortUrl ?? null,
						}}
					/>
				</div>
			</Suspense>
		</div>
	);
};
