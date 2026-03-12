'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useUpdateShortUrlMutation } from '@/lib/api/url-shortener';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import type { ApiError } from '@/lib/api/ApiError';

const editShortUrlSchema = z.object({
	name: z.string().max(255).optional(),
	destinationUrl: z.httpUrl(),
});

type EditShortUrlForm = z.infer<typeof editShortUrlSchema>;

interface EditShortUrlDialogProps {
	shortUrl: TShortUrlWithCustomDomainResponseDto;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function EditShortUrlDialog({
	shortUrl,
	open,
	onOpenChange,
	onSuccess,
}: EditShortUrlDialogProps) {
	const t = useTranslations('shortUrl');
	const updateMutation = useUpdateShortUrlMutation();

	const form = useForm<EditShortUrlForm>({
		resolver: zodResolver(editShortUrlSchema),
		defaultValues: {
			name: shortUrl.name ?? '',
			destinationUrl: shortUrl.destinationUrl ?? '',
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			name: shortUrl.name ?? '',
			destinationUrl: shortUrl.destinationUrl ?? '',
		});
	}, [form, shortUrl, open]);

	const onSubmit = async (data: EditShortUrlForm) => {
		try {
			await updateMutation.mutateAsync({
				shortCode: shortUrl.shortCode,
				data: {
					name: data.name || null,
					destinationUrl: data.destinationUrl,
				},
			});
			posthog.capture('short-url-updated', {
				shortCode: shortUrl.shortCode,
				destinationChanged: data.destinationUrl !== shortUrl.destinationUrl,
			});
			toast({ title: t('edit.success') });
			onOpenChange(false);
			onSuccess?.();
		} catch (e: unknown) {
			const error = e as ApiError;
			if (error.code >= 500) {
				Sentry.captureException(error, {
					extra: {
						shortCode: shortUrl.shortCode,
						error: { code: error.code, message: error.message },
					},
				});
			}
			posthog.capture('error:short-url-updated', {
				shortCode: shortUrl.shortCode,
				error: { code: error.code, message: error.message },
			});
			toast({
				variant: 'destructive',
				title: t('error.update.title'),
				description: error.message,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('edit.title')}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('edit.nameLabel')}</FormLabel>
									<FormControl>
										<Input placeholder={t('edit.namePlaceholder')} {...field} />
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
						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={!form.formState.isDirty || updateMutation.isPending}
								isLoading={updateMutation.isPending}
							>
								{t('edit.submitBtn')}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
