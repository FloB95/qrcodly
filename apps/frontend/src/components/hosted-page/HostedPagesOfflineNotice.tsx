'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import type { THostedPageType } from '@shared/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useHostedPageUsageQuery } from '@/lib/api/hosted-page';
import { useListQrCodesQuery } from '@/lib/api/qr-code';

type HostedPagesOfflineNoticeProps =
	/** One page, e.g. in its editor or on its detail page */
	| { scope: 'page'; type: THostedPageType }
	/** All pages of the account, e.g. on the billing page */
	| { scope: 'account' };

/**
 * Shown while a cancelled Pro plan is still running: hosted pages go offline with it, like custom
 * domains. Product pages get the reminder that their manuals have to stay available.
 */
export function HostedPagesOfflineNotice(props: HostedPagesOfflineNoticeProps) {
	const t = useTranslations('hostedPage.offlineNotice');
	const locale = useLocale();
	const { isCanceled, subscription } = useHasProPlan();
	const account = props.scope === 'account';
	const { data: usage } = useHostedPageUsageQuery(null);
	const { data: products } = useListQrCodesQuery(1, 1, { contentType: ['product'] }, isCanceled);

	if (!isCanceled || !subscription?.currentPeriodEnd) return null;
	// every hosted page holds at least one file, also those that open their PDF directly
	if (account && (usage?.files.used ?? 0) === 0) return null;

	const date = new Date(subscription.currentPeriodEnd).toLocaleDateString(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const hasProducts = account ? (products?.total ?? 0) > 0 : props.type === 'product';

	return (
		<Alert variant="destructive">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>{t(account ? 'accountTitle' : 'pageTitle')}</AlertTitle>
			<AlertDescription className="flex flex-col items-start gap-2">
				<span>{t(account ? 'accountDescription' : 'pageDescription', { date })}</span>
				{hasProducts && <span>{t('products')}</span>}
				<Link
					href="/dashboard/settings/billing"
					className="font-medium underline underline-offset-2"
				>
					{t('keep')}
				</Link>
			</AlertDescription>
		</Alert>
	);
}
