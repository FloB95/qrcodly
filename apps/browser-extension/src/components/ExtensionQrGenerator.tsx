import { useEffect, useState } from 'react';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import type { QrCodeGeneratorState } from '@/store/useQrCodeStore';
import { QrCodeDefaults } from '@shared/schemas';
import { TableLoader } from '@/components/ui/table-loader';

export function ExtensionQrGenerator() {
	const [initState, setInitState] = useState<QrCodeGeneratorState | null>(null);

	useEffect(() => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const currentUrl = tabs[0]?.url ?? '';
			setInitState({
				config: QrCodeDefaults,
				content: {
					type: 'url',
					data: {
						url: currentUrl,
						isDynamic: false,
					},
				},
				latestQrCode: undefined,
				lastError: undefined,
				bulkMode: {
					file: undefined,
					isBulkMode: false,
				},
			});
		});
	}, []);

	if (!initState) {
		return (
			<div className="relative min-h-[400px]">
				<TableLoader />
			</div>
		);
	}

	return (
		<QrCodeGeneratorStoreProvider initState={initState}>
			<QRcodeGenerator generatorType="QrCodeWithDownloadBtn" compact />
		</QrCodeGeneratorStoreProvider>
	);
}
