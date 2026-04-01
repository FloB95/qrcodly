'use client';

import { type ReactNode, useEffect, useState } from 'react';
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCreateShortUrlMutation } from '@/lib/api/url-shortener';
import { useDefaultCustomDomainQuery } from '@/lib/api/custom-domain';
import { DomainSelector } from '@/components/qr-generator/content/DomainSelector';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

const createShortUrlSchema = z.object({
	name: z.string().max(255).optional(),
	destinationUrl: z.httpUrl(),
	customDomainId: z.string().nullable(),
});

type CreateShortUrlForm = z.infer<typeof createShortUrlSchema>;

type CreateShortUrlDialogProps = {
	trigger?: ReactNode;
};

export function CreateShortUrlDialog({ trigger }: CreateShortUrlDialogProps) {
	const t = useTranslations('shortUrl');
	const [open, setOpen] = useState(false);
	const createMutation = useCreateShortUrlMutation();
	const { data: defaultDomain } = useDefaultCustomDomainQuery();

	const form = useForm<CreateShortUrlForm>({
		resolver: zodResolver(createShortUrlSchema),
		defaultValues: {
			name: '',
			destinationUrl: '',
			customDomainId: null,
		},
	});

	useEffect(() => {
		if (defaultDomain?.id && !form.getValues('customDomainId')) {
			form.setValue('customDomainId', defaultDomain.id);
		}
	}, [defaultDomain, form]);

	const onSubmit = async (data: CreateShortUrlForm) => {
		try {
			await createMutation.mutateAsync({
				name: data.name || null,
				destinationUrl: data.destinationUrl,
				isActive: true,
				customDomainId: data.customDomainId,
			});
			posthog.capture('short-url-created', {
				destinationUrl: data.destinationUrl,
			});
			toast({ title: t('create.success'), description: t('create.successDescription') });
			setOpen(false);
			form.reset({ name: '', destinationUrl: '', customDomainId: defaultDomain?.id ?? null });
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
						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={createMutation.isPending}
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
