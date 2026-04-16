'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { useCreateApiKeyMutation } from '@/lib/api/api-key';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
	FormDescription,
} from '@/components/ui/form';
import { Loader2, Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const CreateApiKeySchema = z.object({
	name: z.string().min(1).max(100).trim(),
	description: z.string().max(64).default('').optional(),
	expiresInDays: z.number().int().positive().optional().or(z.literal(null)),
});

type CreateApiKeyFormData = z.infer<typeof CreateApiKeySchema>;

export function CreateApiKeyDialog() {
	const t = useTranslations('settings.apiKeys');
	const tGeneral = useTranslations('general');
	const [open, setOpen] = useState(false);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const createMutation = useCreateApiKeyMutation();
	const isCreating = createMutation.isPending;
	const { hasProPlan, isLoading: isPlanLoading } = useHasProPlan();

	const form = useForm<CreateApiKeyFormData>({
		resolver: zodResolver(CreateApiKeySchema),
		defaultValues: {
			name: '',
			description: '',
			expiresInDays: null,
		},
	});

	const onSubmit = async (data: CreateApiKeyFormData) => {
		try {
			const key = await createMutation.mutateAsync({
				name: data.name,
				description: data.description || undefined,
				expiresInDays: data.expiresInDays ?? null,
			});
			setCreatedKey(key.secret);
			form.reset();
			posthog.capture('api-key:created', { name: data.name });
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : t('errorDescription');
			toast({
				title: t('errorTitle'),
				description: errorMessage,
				variant: 'destructive',
			});
			Sentry.captureException(err);
			posthog.capture('error:api-key-create', { error: err });
		}
	};

	const handleCopy = async () => {
		if (createdKey) {
			try {
				await navigator.clipboard.writeText(createdKey);
				toast({
					title: t('copied'),
					description: t('copiedDescription'),
				});
			} catch {
				toast({
					variant: 'destructive',
					description: tGeneral('copyFailed'),
				});
			}
		}
	};

	useEffect(() => {
		if (!open) {
			setTimeout(() => {
				setCreatedKey(null);
				form.reset();
			}, 200);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	if (!isPlanLoading && !hasProPlan) {
		return (
			<Button asChild size="sm" variant="outline">
				<Link href="/dashboard/settings/billing">{t('upgradeCta')}</Link>
			</Button>
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val) => {
				setOpen(val);
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm" disabled={isPlanLoading}>
					{t('create')}
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{createdKey ? t('createdTitle') : t('formTitle')}</DialogTitle>
					{!createdKey && <DialogDescription>{t('formHint')}</DialogDescription>}
				</DialogHeader>

				{!createdKey ? (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('name')}*</FormLabel>
										<FormControl>
											<Input placeholder={t('namePlaceholder')} {...field} disabled={isCreating} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('descriptionLabel')}</FormLabel>
										<FormControl>
											<Input placeholder={t('descriptionLabel')} {...field} disabled={isCreating} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="expiresInDays"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('expiresAt')}</FormLabel>
										<FormControl>
											<Select
												value={field.value?.toString() ?? 'null'}
												onValueChange={(val) => field.onChange(val === 'null' ? null : Number(val))}
												disabled={isCreating}
											>
												<SelectTrigger>
													<SelectValue placeholder={t('expiresAtPlaceholder')} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="null">{t('never')}</SelectItem>
													<SelectItem value="1">1 {t('day')}</SelectItem>
													<SelectItem value="7">7 {t('days')}</SelectItem>
													<SelectItem value="30">30 {t('days')}</SelectItem>
													<SelectItem value="60">60 {t('days')}</SelectItem>
													<SelectItem value="90">90 {t('days')}</SelectItem>
													<SelectItem value="180">180 {t('days')}</SelectItem>
													<SelectItem value="365">1 {t('year')}</SelectItem>
												</SelectContent>
											</Select>
										</FormControl>
										<FormDescription>{t('expiresAtDescription')}</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setOpen(false)}
									disabled={isCreating}
								>
									{t('cancel')}
								</Button>
								<Button type="submit" disabled={isCreating}>
									{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{t('create')}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				) : (
					<div className="space-y-4">
						<p>{t('revealKeyInfo')}</p>
						<div className="flex items-center gap-2 bg-muted p-4 rounded">
							<code className="flex-1 break-all font-mono">{createdKey}</code>
							<Button variant="outline" size="sm" onClick={handleCopy}>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						<Button className="w-full" onClick={() => setOpen(false)}>
							{t('close')}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
