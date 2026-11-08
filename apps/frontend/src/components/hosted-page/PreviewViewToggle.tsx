'use client';

import { useTranslations } from 'next-intl';
import { DevicePhoneMobileIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export type TPreviewView = 'qr' | 'page';

/** "QR code | page" above the output of a hosted code, in the editor and on the code's detail page. */
export function PreviewViewToggle({
	view,
	onChange,
}: {
	view: TPreviewView;
	onChange: (view: TPreviewView) => void;
}) {
	const t = useTranslations('generator.contentSwitch.hosted.previewSwitch');
	const options: { value: TPreviewView; label: string; icon: typeof QrCodeIcon }[] = [
		{ value: 'qr', label: t('qr'), icon: QrCodeIcon },
		{ value: 'page', label: t('page'), icon: DevicePhoneMobileIcon },
	];

	return (
		<div
			role="tablist"
			aria-label={t('label')}
			className="inline-flex rounded-full border bg-white p-1 shadow-sm"
		>
			{options.map(({ value, label, icon: Icon }) => (
				<button
					key={value}
					type="button"
					role="tab"
					aria-selected={view === value}
					onClick={() => onChange(value)}
					className={cn(
						'flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
						view === value
							? 'bg-slate-900 text-white shadow'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					<Icon className="size-4" />
					{label}
				</button>
			))}
		</div>
	);
}
