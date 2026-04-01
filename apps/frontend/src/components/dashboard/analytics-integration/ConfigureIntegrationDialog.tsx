'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/ui/use-toast';
import {
	useCreateAnalyticsIntegrationMutation,
	useUpdateAnalyticsIntegrationMutation,
} from '@/lib/api/analytics-integration';
import { GoogleAnalyticsCredentialsSchema, MatomoCredentialsSchema } from '@shared/schemas';
import type { TProviderType, TAnalyticsIntegrationResponseDto } from '@shared/schemas';
import type { ApiError } from '@/lib/api/ApiError';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

interface ConfigureIntegrationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	providerType: TProviderType;
	existing?: TAnalyticsIntegrationResponseDto;
}

export function ConfigureIntegrationDialog({
	open,
	onOpenChange,
	providerType,
	existing,
}: ConfigureIntegrationDialogProps) {
	const t = useTranslations('settings.integrations');
	const { toast } = useToast();
	const createMutation = useCreateAnalyticsIntegrationMutation();
	const updateMutation = useUpdateAnalyticsIntegrationMutation();

	// GA4 fields
	const [measurementId, setMeasurementId] = useState('');
	const [apiSecret, setApiSecret] = useState('');

	// Matomo fields
	const [matomoUrl, setMatomoUrl] = useState('');
	const [siteId, setSiteId] = useState('');
	const [authToken, setAuthToken] = useState('');
	const [removeAuthToken, setRemoveAuthToken] = useState(false);

	// Field errors
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Reset form state when dialog opens or integration changes
	useEffect(() => {
		if (!open) return;
		const parsedMatomo = existing?.displayIdentifier?.match(/^(.+) \(Site (.+)\)$/);
		setMeasurementId(
			existing?.providerType === 'google_analytics' ? (existing.displayIdentifier ?? '') : '',
		);
		setApiSecret('');
		setMatomoUrl(parsedMatomo?.[1] ?? '');
		setSiteId(parsedMatomo?.[2] ?? '');
		setAuthToken('');
		setRemoveAuthToken(false);
		setErrors({});
	}, [open, existing, providerType]);

	const isSubmitting = createMutation.isPending || updateMutation.isPending;
	const isGA = providerType === 'google_analytics';

	const buildCredentials = () => {
		if (isGA) return { measurementId, apiSecret };
		// When removing token explicitly, send empty string to clear it on the backend.
		// When field is empty and not removing, omit it to preserve existing token.
		if (removeAuthToken) return { matomoUrl, siteId, authToken: '' };
		return { matomoUrl, siteId, ...(authToken ? { authToken } : {}) };
	};

	const validate = (): boolean => {
		const credentials = buildCredentials();

		const schema = isGA ? GoogleAnalyticsCredentialsSchema : MatomoCredentialsSchema;
		const result = schema.safeParse(credentials);

		if (result.success) {
			setErrors({});
			return true;
		}

		const fieldErrors: Record<string, string> = {};
		for (const issue of result.error.issues) {
			const field = String(issue.path[0]);
			if (!fieldErrors[field]) {
				fieldErrors[field] = issue.message;
			}
		}
		setErrors(fieldErrors);
		return false;
	};

	const handleSubmit = async () => {
		if (!validate()) return;

		const credentials = buildCredentials();

		try {
			if (existing) {
				await updateMutation.mutateAsync({
					id: existing.id,
					dto: { credentials },
				});
				posthog.capture('analytics-integration:updated', { providerType });
				toast({ title: t('updated'), description: t('updatedDescription') });
			} else {
				await createMutation.mutateAsync({
					providerType,
					credentials,
				});
				posthog.capture('analytics-integration:created', { providerType });
				toast({ title: t('created'), description: t('createdDescription') });
			}
			onOpenChange(false);
		} catch (e: unknown) {
			const error = e as ApiError;
			if (error.code === 0 || error.code >= 500) {
				Sentry.captureException(error, { extra: { providerType } });
			}
			posthog.capture('error:analytics-integration-save', {
				providerType,
				error: { code: error.code, message: error.message },
			});
			toast({
				title: t('error'),
				description: t('saveError'),
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>
						{existing ? t('editTitle') : t('configureTitle')}{' '}
						{isGA ? 'Google Analytics 4' : 'Matomo'}
					</DialogTitle>
					<DialogDescription>
						{isGA ? t('ga4Description') : t('matomoDescription')}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{isGA ? (
						<>
							<div className="space-y-2">
								<Label htmlFor="measurementId">{t('measurementId')}</Label>
								<Input
									id="measurementId"
									placeholder="G-XXXXXXXXXX"
									value={measurementId}
									onChange={(e) => setMeasurementId(e.target.value)}
									aria-invalid={!!errors.measurementId}
								/>
								{errors.measurementId && (
									<p className="text-sm text-destructive">{errors.measurementId}</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="apiSecret">{t('apiSecret')}</Label>
								<Input
									id="apiSecret"
									type="password"
									placeholder={t('apiSecretPlaceholder')}
									value={apiSecret}
									onChange={(e) => setApiSecret(e.target.value)}
									aria-invalid={!!errors.apiSecret}
								/>
								{errors.apiSecret && <p className="text-sm text-destructive">{errors.apiSecret}</p>}
							</div>
						</>
					) : (
						<>
							<div className="space-y-2">
								<Label htmlFor="matomoUrl">{t('matomoUrl')}</Label>
								<Input
									id="matomoUrl"
									placeholder="https://matomo.example.com"
									value={matomoUrl}
									onChange={(e) => setMatomoUrl(e.target.value)}
									aria-invalid={!!errors.matomoUrl}
								/>
								{errors.matomoUrl && <p className="text-sm text-destructive">{errors.matomoUrl}</p>}
							</div>
							<div className="space-y-2">
								<Label htmlFor="siteId">{t('siteId')}</Label>
								<Input
									id="siteId"
									placeholder="1"
									value={siteId}
									onChange={(e) => setSiteId(e.target.value)}
									aria-invalid={!!errors.siteId}
								/>
								{errors.siteId && <p className="text-sm text-destructive">{errors.siteId}</p>}
							</div>
							<div className="space-y-2">
								<Label htmlFor="authToken">
									{t('authToken')} <span className="text-muted-foreground">({t('optional')})</span>
								</Label>
								{removeAuthToken ? (
									<div className="flex items-center gap-2">
										<p className="text-sm text-muted-foreground">{t('authTokenWillBeRemoved')}</p>
										<Button
											type="button"
											variant="link"
											size="sm"
											className="h-auto p-0"
											onClick={() => setRemoveAuthToken(false)}
										>
											{t('undo')}
										</Button>
									</div>
								) : (
									<>
										<div className="flex gap-2">
											<Input
												id="authToken"
												type="password"
												placeholder={existing?.hasAuthToken ? '••••••••••••••••' : undefined}
												value={authToken}
												onChange={(e) => setAuthToken(e.target.value)}
												className="flex-1"
											/>
											{existing?.hasAuthToken && !authToken && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="shrink-0"
													onClick={() => setRemoveAuthToken(true)}
												>
													{t('clear')}
												</Button>
											)}
										</div>
									</>
								)}
							</div>
						</>
					)}

					{isGA && (
						<Alert>
							<ExclamationTriangleIcon className="size-4" />
							<AlertTitle>{t('ga4ManualVerificationTitle')}</AlertTitle>
							<AlertDescription>{t('ga4ManualVerificationDescription')}</AlertDescription>
						</Alert>
					)}

					{!existing && (
						<Alert>
							<ShieldCheckIcon className="size-4" />
							<AlertTitle>{t('privacyNoticeTitle')}</AlertTitle>
							<AlertDescription>{t('privacyNoticeDescription')}</AlertDescription>
						</Alert>
					)}
				</div>

				<div className="flex justify-end gap-2 mt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t('cancel')}
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? t('saving') : existing ? t('save') : t('create')}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
