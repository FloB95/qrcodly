'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Button, buttonVariants } from '@/components/ui/button';
import { Link as LocaleLink } from '@/i18n/navigation';
import { safeLocalStorage } from '@/lib/utils';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { HOSTED_PAGE_LIMITS } from '@/lib/api/hosted-page';

/** Hosted pages are a Pro feature; this explains why the editor is locked and where to unlock it. */
export function HostedPageProGate() {
	const t = useTranslations('generator.contentSwitch.hosted');
	const { isSignedIn } = useAuth();
	const { content, config } = useQrCodeGeneratorStore((state) => state);
	const [loginOpen, setLoginOpen] = useState(false);

	if (!isSignedIn) {
		return (
			<div className="mb-6 rounded-xl border border-dashed bg-white/60 p-5">
				<div className="flex items-start gap-3">
					<LockClosedIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
					<div>
						<p className="font-semibold">{t('loginTitle')}</p>
						<p className="mt-1 text-sm text-muted-foreground">{t('loginDescription')}</p>
						<Button
							size="sm"
							className="mt-3"
							onClick={() => {
								safeLocalStorage.setItem('unsavedQrContent', JSON.stringify(content));
								safeLocalStorage.setItem('unsavedQrConfig', JSON.stringify(config));
								setLoginOpen(true);
							}}
						>
							{t('loginCta')}
						</Button>
					</div>
				</div>
				<LoginRequiredDialog alertOpen={loginOpen} setAlertOpen={setLoginOpen} />
			</div>
		);
	}

	return (
		<div className="mb-6 rounded-xl border border-teal-800/30 bg-teal-50 p-5">
			<div className="flex items-start gap-3">
				<SparklesIcon className="mt-0.5 size-5 shrink-0 text-teal-800" />
				<div>
					<p className="font-semibold text-teal-900">{t('proTitle')}</p>
					<p className="mt-1 text-sm text-teal-900/80">
						{t('proDescription', {
							maxPages: HOSTED_PAGE_LIMITS.pro.maxLandingPages,
							maxFiles: HOSTED_PAGE_LIMITS.pro.maxFiles,
							maxSize: HOSTED_PAGE_LIMITS.pro.maxFileSizeBytes.pdf / (1024 * 1024),
						})}
					</p>
					<LocaleLink href="/plans" className={buttonVariants({ size: 'sm', className: 'mt-3' })}>
						{t('upgradeCta')}
					</LocaleLink>
				</div>
			</div>
		</div>
	);
}
