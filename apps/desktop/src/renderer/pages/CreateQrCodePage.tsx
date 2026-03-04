import { QRcodeGenerator } from '@/components/qr-generator/QRcodeGenerator';
import { QrCodeGeneratorStoreProvider } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function CreateQrCodePage() {
	const t = useTranslations('general');

	const backLink = (
		<Link
			className="hidden lg:flex items-center space-x-2 px-2 -top-12 absolute"
			href="/dashboard/qr-codes"
		>
			<ChevronLeftIcon className="w-5 h-5" /> <span>{t('backToOverview')}</span>
		</Link>
	);

	return (
		<QrCodeGeneratorStoreProvider>
			<QRcodeGenerator generatorType="QrCodeWithDownloadBtn" backLink={backLink} />
		</QrCodeGeneratorStoreProvider>
	);
}
