'use client';

import { useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { useCreateShortUrlMutation } from '@/lib/api/url-shortener';
import { createLinkFromShortUrl } from '@/lib/utils';
import { ArrowRightIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLocale } from 'next-intl';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';

const shortenUrlSchema = z.object({
	destinationUrl: z.httpUrl(),
});

type ShortenUrlForm = z.infer<typeof shortenUrlSchema>;

export function UrlShortenerHeroForm() {
	const t = useTranslations('productsUrlShortener.hero');
	const tShortUrl = useTranslations('shortUrl');
	const tGeneral = useTranslations('general');
	const locale = useLocale();
	const { isSignedIn } = useAuth();
	const clerk = useClerk();
	const createMutation = useCreateShortUrlMutation();
	const [result, setResult] = useState<TShortUrlWithCustomDomainResponseDto | null>(null);
	const [copied, setCopied] = useState(false);

	const form = useForm<ShortenUrlForm>({
		resolver: zodResolver(shortenUrlSchema),
		defaultValues: {
			destinationUrl: '',
		},
	});

	const onSubmit = async (data: ShortenUrlForm) => {
		if (!isSignedIn) {
			clerk.openSignIn({ forceRedirectUrl: `/${locale}/dashboard/short-urls` });
			return;
		}

		try {
			const created = await createMutation.mutateAsync({
				destinationUrl: data.destinationUrl,
				isActive: true,
				customDomainId: null,
				name: null,
			});
			posthog.capture('short-url-created', {
				source: 'hero-form',
				destinationDomain: new URL(data.destinationUrl).hostname,
			});
			toast({
				title: tShortUrl('create.success'),
				description: tShortUrl('create.successDescription'),
			});
			setResult(created);
		} catch (e: unknown) {
			const error = e as ApiError;
			if (error.code === 0 || error.code >= 500) {
				Sentry.captureException(error, {
					extra: {
						destinationUrl: data.destinationUrl,
						error: { code: error.code, message: error.message },
					},
				});
			}
			posthog.capture('error:short-url-created', {
				error: { code: error.code, message: error.message },
			});
			toast({
				variant: 'destructive',
				title: tShortUrl('error.create.title'),
				description: error.message,
			});
		}
	};

	const handleCopy = async () => {
		if (!result) return;
		try {
			const link = createLinkFromShortUrl(result);
			await navigator.clipboard.writeText(link);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast({
				variant: 'destructive',
				description: tGeneral('copyFailed'),
			});
		}
	};

	const handleReset = () => {
		setResult(null);
		form.reset({ destinationUrl: '' });
	};

	if (result) {
		const link = createLinkFromShortUrl(result);
		const displayLink = createLinkFromShortUrl(result, { short: true });
		return (
			<div className="w-full max-w-2xl mx-auto">
				<div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-card dark:via-card dark:to-card dark:ring-1 dark:ring-border p-4 sm:p-6">
					<p className="mb-3 text-sm text-white/80">{t('successMessage')}</p>
					<div className="flex items-center gap-3">
						<div className="min-w-0 flex-1">
							<a
								href={link}
								target="_blank"
								rel="noopener noreferrer"
								className="block truncate text-lg font-semibold text-white hover:underline"
							>
								{displayLink}
							</a>
						</div>
						<Button
							onClick={handleCopy}
							variant="outline"
							size="sm"
							className="shrink-0 gap-2 border-white/30 bg-card/10 text-white hover:bg-card/20 hover:text-white"
						>
							{copied ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
							{copied ? t('copiedBtn') : t('copyBtn')}
						</Button>
					</div>
					<button
						onClick={handleReset}
						className="mt-3 text-sm text-white/60 underline hover:text-white/90"
					>
						{t('createAnother')}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-2xl mx-auto">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
						<FormField
							control={form.control}
							name="destinationUrl"
							render={({ field }) => (
								<FormItem className="flex-1 sm:relative">
									<FormControl>
										<Input
											{...field}
											type="url"
											placeholder={t('inputPlaceholder')}
											className="h-12 text-base"
											onBlur={(e) => {
												field.onBlur();
												if (e.target.value === '') return;
												if (
													!e.target.value.startsWith('http://') &&
													!e.target.value.startsWith('https://')
												) {
													field.onChange(`https://${e.target.value}`);
												}
											}}
										/>
									</FormControl>
									<FormMessage className="sm:absolute sm:left-0 sm:top-full" />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							size="lg"
							disabled={createMutation.isPending}
							isLoading={createMutation.isPending}
							className="shrink-0 gap-2 h-12 whitespace-nowrap"
						>
							{t('submitBtn')}
							<ArrowRightIcon className="size-4" />
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
