'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateApiKeyMutation } from '@/lib/api/api-key';
import {
	API_KEY_SCOPES,
	UpdateApiKeyDto,
	type ApiKeyScope,
	type TUpdateApiKeyDto,
} from '@shared/schemas';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import type { ApiKey } from './types';

type ScopeKey = `scope${Capitalize<ApiKeyScope>}`;
type ScopeHintKey = `${ScopeKey}Hint`;

interface EditApiKeyDialogProps {
	apiKey: ApiKey;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditApiKeyDialog({ apiKey, open, onOpenChange }: EditApiKeyDialogProps) {
	const t = useTranslations('settings.apiKeys');
	const update = useUpdateApiKeyMutation();
	const isUpdating = update.isPending;
	const [hasInteracted, setHasInteracted] = useState(false);

	const form = useForm<TUpdateApiKeyDto>({
		resolver: zodResolver(UpdateApiKeyDto),
		defaultValues: {
			scopes: apiKey.scopes && apiKey.scopes.length > 0 ? [...apiKey.scopes] : [...API_KEY_SCOPES],
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				scopes:
					apiKey.scopes && apiKey.scopes.length > 0 ? [...apiKey.scopes] : [...API_KEY_SCOPES],
			});
			setHasInteracted(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, apiKey.id]);

	const onSubmit = async (data: TUpdateApiKeyDto) => {
		try {
			await update.mutateAsync({ id: apiKey.id, dto: data });
			posthog.capture('api-key:updated', { apiKeyId: apiKey.id });
			toast({ description: t('editSuccess') });
			onOpenChange(false);
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : t('errorDescription');
			toast({
				title: t('errorTitle'),
				description: errorMessage,
				variant: 'destructive',
			});
			Sentry.captureException(err);
			posthog.capture('error:api-key-update', { error: err, apiKeyId: apiKey.id });
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('editTitle')}</DialogTitle>
					<DialogDescription className="text-destructive font-medium">
						{t('securityNote')}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="scopes"
							render={({ field }) => (
								<FormItem className="space-y-3">
									<FormLabel>{t('scopesLabel')}</FormLabel>
									<div className="space-y-2" role="group" aria-label={t('scopesLabel')}>
										{API_KEY_SCOPES.map((scope) => {
											const checked = field.value?.includes(scope) ?? false;
											const labelKey =
												`scope${scope.charAt(0).toUpperCase()}${scope.slice(1)}` as ScopeKey;
											const hintKey: ScopeHintKey = `${labelKey}Hint`;
											return (
												<label
													key={scope}
													className="flex cursor-pointer items-center gap-2 text-sm"
												>
													<Checkbox
														checked={checked}
														disabled={isUpdating}
														onCheckedChange={(next) => {
															setHasInteracted(true);
															const current = field.value ?? [];
															if (next) field.onChange([...current, scope]);
															else field.onChange(current.filter((s) => s !== scope));
														}}
													/>
													<span>
														<span className="font-medium">{t(labelKey)}</span>{' '}
														<span className="text-muted-foreground">{t(hintKey)}</span>
													</span>
												</label>
											);
										})}
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<p className="text-xs text-muted-foreground">{t('editPropagationNote')}</p>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isUpdating}
							>
								{t('cancel')}
							</Button>
							<Button type="submit" disabled={isUpdating || !hasInteracted}>
								{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{t('save')}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
