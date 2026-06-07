'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCheckSlugAvailabilityQuery, useCreateShortUrlMutation } from '@/lib/api/url-shortener';
import { useDefaultCustomDomainQuery, useListCustomDomainsQuery } from '@/lib/api/custom-domain';
import { DomainSelector } from '@/components/qr-generator/content/DomainSelector';
import { CustomSlugSchema } from '@shared/schemas';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { ProPlanRequiredBadge } from '@/components/ProPlanRequiredBadge';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

const createShortUrlSchema = z
	.object({
		name: z.string().max(255).optional(),
		destinationUrl: z.httpUrl(),
		customDomainId: z.string().nullable(),
		customSlug: z.union([CustomSlugSchema, z.literal('')]).optional(),
	})
	.refine((d) => !d.customSlug || d.customDomainId, {
		message: 'Custom slug requires a custom domain',
		path: ['customSlug'],
	});

type CreateShortUrlForm = z.infer<typeof createShortUrlSchema>;

type CreateShortUrlDialogProps = {
	trigger?: ReactNode;
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(id);
	}, [value, delayMs]);
	return debounced;
}

export function CreateShortUrlDialog({ trigger }: CreateShortUrlDialogProps) {
	const t = useTranslations('shortUrl');
	const [open, setOpen] = useState(false);
	const createMutation = useCreateShortUrlMutation();
	const { data: defaultDomain } = useDefaultCustomDomainQuery();
	const { data: domainsData } = useListCustomDomainsQuery(1, 100);
	const { hasProPlan } = useHasProPlan();

	const form = useForm<CreateShortUrlForm>({
		resolver: zodResolver(createShortUrlSchema),
		defaultValues: {
			name: '',
			destinationUrl: '',
			customDomainId: null,
			customSlug: '',
		},
	});

	useEffect(() => {
		if (defaultDomain?.id && !form.getValues('customDomainId')) {
			form.setValue('customDomainId', defaultDomain.id);
		}
	}, [defaultDomain, form]);

	const customDomainId = form.watch('customDomainId');
	const customSlug = form.watch('customSlug') ?? '';

	const selectedDomain = useMemo(
		() => domainsData?.data.find((d) => d.id === customDomainId) ?? null,
		[domainsData, customDomainId],
	);

	const slugInputEnabled = hasProPlan && !!selectedDomain;
	const debouncedSlug = useDebouncedValue(customSlug.toLowerCase().trim(), 350);
	const slugFormatValid = CustomSlugSchema.safeParse(debouncedSlug).success;

	const slugAvailability = useCheckSlugAvailabilityQuery(
		slugFormatValid ? debouncedSlug : '',
		slugInputEnabled ? customDomainId : null,
	);

	const slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid' = (() => {
		if (!debouncedSlug) return 'idle';
		if (!slugFormatValid) return 'invalid';
		if (slugAvailability.isFetching) return 'checking';
		if (slugAvailability.data?.available) return 'available';
		if (slugAvailability.data?.reason === 'reserved') return 'reserved';
		if (slugAvailability.data?.reason === 'taken') return 'taken';
		if (slugAvailability.data?.reason === 'invalid') return 'invalid';
		return 'idle';
	})();

	const previewHost = selectedDomain?.domain;
	const previewUrl =
		previewHost && customSlug.trim() ? `https://${previewHost}/u/${customSlug.trim()}` : null;

	const onSubmit = async (data: CreateShortUrlForm) => {
		const slug = data.customSlug?.trim().toLowerCase() || null;
		if (slug && (!slugInputEnabled || slugStatus !== 'available')) {
			toast({
				variant: 'destructive',
				title: t('error.create.title'),
				description: t('create.customSlug.notAvailable'),
			});
			return;
		}
		try {
			await createMutation.mutateAsync({
				name: data.name || null,
				destinationUrl: data.destinationUrl,
				isActive: true,
				customDomainId: data.customDomainId,
				customSlug: slug,
			});
			posthog.capture('short-url-created', {
				destinationUrl: data.destinationUrl,
				hasCustomSlug: !!slug,
			});
			toast({ title: t('create.success'), description: t('create.successDescription') });
			setOpen(false);
			form.reset({
				name: '',
				destinationUrl: '',
				customDomainId: defaultDomain?.id ?? null,
				customSlug: '',
			});
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
				title: t('error.create.title'),
				description: error.message,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button size="sm" className="gap-2">
						<PlusIcon className="size-4" />
						<span className="sm:hidden lg:inline whitespace-nowrap">{t('createBtn')}</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('create.title')}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('create.nameLabel')}</FormLabel>
									<FormControl>
										<Input placeholder={t('create.namePlaceholder')} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="destinationUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('create.destinationLabel')}</FormLabel>
									<FormControl>
										<Input placeholder={t('create.destinationPlaceholder')} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="customDomainId"
							render={({ field }) => (
								<DomainSelector value={field.value} onChange={field.onChange} />
							)}
						/>
						<FormField
							control={form.control}
							name="customSlug"
							render={({ field }) => (
								<FormItem>
									<div className="flex items-center justify-between gap-2">
										<FormLabel>{t('create.customSlug.label')}</FormLabel>
										{!hasProPlan && <ProPlanRequiredBadge />}
									</div>
									<FormControl>
										<Input
											placeholder={t('create.customSlug.placeholder')}
											disabled={!slugInputEnabled}
											{...field}
											value={field.value ?? ''}
											onChange={(e) =>
												field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))
											}
										/>
									</FormControl>
									<FormDescription>
										{!hasProPlan
											? t('create.customSlug.proRequired')
											: !selectedDomain
												? t('create.customSlug.requiresDomain')
												: previewUrl
													? `${t('create.customSlug.preview')}: ${previewUrl}`
													: t('create.customSlug.help')}
									</FormDescription>
									{slugInputEnabled && customSlug.trim() && (
										<p
											className={
												slugStatus === 'available'
													? 'text-xs text-emerald-600'
													: slugStatus === 'checking'
														? 'text-xs text-muted-foreground'
														: 'text-xs text-destructive'
											}
										>
											{slugStatus === 'checking' && t('create.customSlug.checking')}
											{slugStatus === 'available' && `✓ ${t('create.customSlug.available')}`}
											{slugStatus === 'taken' && `✗ ${t('create.customSlug.taken')}`}
											{slugStatus === 'reserved' && `✗ ${t('create.customSlug.reserved')}`}
											{slugStatus === 'invalid' && `✗ ${t('create.customSlug.invalid')}`}
										</p>
									)}
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={
									createMutation.isPending ||
									(!!customSlug.trim() && slugInputEnabled && slugStatus !== 'available')
								}
								isLoading={createMutation.isPending}
							>
								{t('create.submitBtn')}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
