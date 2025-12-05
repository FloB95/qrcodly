import { Suspense } from 'react';
import { DynamicQrCode } from './DynamicQrCode';
import { useQrCodeGeneratorStore } from '../provider/QrCodeConfigStoreProvider';
import UpdateQrCodeBtn from './UpdateQrCodeBtn';

export const QrCodeWithUpdateBtn = () => {
	const { id, name, config, content } = useQrCodeGeneratorStore((state) => state);
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
				<div className="mt-6 flex justify-center flex-col space-y-2 mb-3">
					<UpdateQrCodeBtn
						qrCode={{
							id: id!,
							name: name || null,
							content,
							config,
						}}
					/>
				</div>
			</Suspense>
		</div>
	);
};
