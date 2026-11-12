'use client';

import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import {
	NewsletterContentLocale,
	type TNewsletterContentLocale,
	type TUpdateNewsletterSubscriptionDto,
} from '@shared/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Link } from '@/i18n/navigation';
import type { ApiError } from '@/lib/api/ApiError';
import {
	useNewsletterSubscriptionQuery,
	useUpdateNewsletterSubscriptionMutation,
} from '@/lib/api/newsletter';

const LANGUAGE_NAMES: Record<TNewsletterContentLocale, string> = {
	en: 'English',
	de: 'Deutsch',
};

function NewsletterSkeleton() {
	return (
		<>
			<div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-6 w-11 rounded-full" />
			</div>
			<div className="flex items-center justify-between gap-4 p-4 rounded-lg border">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-9 w-40" />
			</div>
		</>
	);
}

export function NewsletterSection() {
	const t = useTranslations('settings.profile');

	const { data, isPending, isError } = useNewsletterSubscriptionQuery();
	const updateMutation = useUpdateNewsletterSubscriptionMutation();

	const status = isError ? 'unavailable' : data?.status;
	const canToggle = status === 'subscribed' || status === 'unsubscribed';

	const handleError = (e: unknown, event: string, dto: TUpdateNewsletterSubscriptionDto) => {
		const error = e as ApiError;
		if (error.code === 0 || error.code >= 500) {
			Sentry.captureException(error, { extra: dto });
		}
		posthog.capture(event, { ...dto, error: { code: error.code, message: error.message } });
		toast({
			// 400: the account has no verified email address, so retrying cannot help
			title: error.code === 400 ? t('newsletterVerifyEmail') : t('newsletterError'),
			variant: 'destructive',
		});
	};

	const handleToggle = async (subscribed: boolean) => {
		try {
			const result = await updateMutation.mutateAsync({ subscribed });
			posthog.capture('newsletter:toggled', { subscribed, status: result.status });
			if (result.status === (subscribed ? 'subscribed' : 'unsubscribed')) {
				toast({ title: subscribed ? t('newsletterSubscribed') : t('newsletterUnsubscribed') });
			}
		} catch (e: unknown) {
			handleError(e, 'error:newsletter-toggle', { subscribed });
		}
	};

	const handleLanguageChange = async (value: string) => {
		// a language change leaves the membership alone
		const dto = { locale: value as TNewsletterContentLocale };
		try {
			const result = await updateMutation.mutateAsync(dto);
			posthog.capture('newsletter:language-changed', { locale: dto.locale });
			if (result.locale === dto.locale) {
				toast({ title: t('newsletterLanguageSaved') });
			}
		} catch (e: unknown) {
			handleError(e, 'error:newsletter-language', dto);
		}
	};

	// Don't render if the newsletter is not set up on this deployment
	if (status === 'disabled') {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<EnvelopeIcon className="size-5" />
					</div>
					<div>
						<CardTitle>{t('newsletterTitle')}</CardTitle>
						<CardDescription>
							{t.rich('newsletterDescription', {
								link: (chunks) => (
									<Link href="/privacy-policy" className="underline hover:text-foreground">
										{chunks}
									</Link>
								),
							})}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{isPending ? (
					<NewsletterSkeleton />
				) : (
					<>
						<div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
							<div className="min-w-0 space-y-1">
								<Label htmlFor="newsletter-switch">{t('newsletterSwitchLabel')}</Label>
								{status === 'blocked' && (
									<p className="text-sm text-muted-foreground">
										{t.rich('newsletterBlocked', {
											contact: (chunks) => (
												<a
													href="mailto:info@qrcodly.de"
													className="underline hover:text-foreground"
												>
													{chunks}
												</a>
											),
										})}
									</p>
								)}
								{status === 'unavailable' && (
									<p className="text-sm text-muted-foreground">{t('newsletterUnavailable')}</p>
								)}
							</div>
							<Switch
								id="newsletter-switch"
								checked={status === 'subscribed'}
								onCheckedChange={handleToggle}
								disabled={!canToggle || updateMutation.isPending}
							/>
						</div>
						{canToggle && (
							<div className="flex flex-col gap-3 p-4 rounded-lg border bg-card sm:flex-row sm:items-center sm:justify-between sm:gap-4">
								<div className="min-w-0 space-y-1">
									<Label htmlFor="newsletter-language">{t('newsletterLanguageLabel')}</Label>
									<p id="newsletter-language-hint" className="text-sm text-muted-foreground">
										{t('newsletterLanguageHint')}
									</p>
								</div>
								<Select
									value={data?.locale ?? 'en'}
									onValueChange={handleLanguageChange}
									disabled={updateMutation.isPending}
								>
									<SelectTrigger
										id="newsletter-language"
										aria-describedby="newsletter-language-hint"
										className="sm:w-40"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{NewsletterContentLocale.options.map((locale) => (
											<SelectItem key={locale} value={locale}>
												<span lang={locale}>{LANGUAGE_NAMES[locale]}</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
