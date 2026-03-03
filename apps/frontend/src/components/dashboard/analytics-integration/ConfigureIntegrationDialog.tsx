'use client';

import { useState } from 'react';
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
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/ui/use-toast';
import {
	useCreateAnalyticsIntegrationMutation,
	useUpdateAnalyticsIntegrationMutation,
} from '@/lib/api/analytics-integration';
import type { TProviderType, TAnalyticsIntegrationResponseDto } from '@shared/schemas';

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

	// Pre-fill non-secret fields from displayIdentifier when editing
	const parsedMatomo = existing?.displayIdentifier?.match(/^(.+) \(Site (.+)\)$/);

	// GA4 fields
	const [measurementId, setMeasurementId] = useState(
		existing?.providerType === 'google_analytics' ? (existing.displayIdentifier ?? '') : '',
	);
	const [apiSecret, setApiSecret] = useState('');

	// Matomo fields
	const [matomoUrl, setMatomoUrl] = useState(parsedMatomo?.[1] ?? '');
	const [siteId, setSiteId] = useState(parsedMatomo?.[2] ?? '');
	const [authToken, setAuthToken] = useState('');

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = async () => {
		const credentials =
			providerType === 'google_analytics'
				? { measurementId, apiSecret }
				: { matomoUrl, siteId, ...(authToken ? { authToken } : {}) };

		try {
			if (existing) {
				await updateMutation.mutateAsync({
					id: existing.id,
					dto: { credentials },
				});
				toast({ title: t('updated'), description: t('updatedDescription') });
			} else {
				await createMutation.mutateAsync({
					providerType,
					credentials,
				});
				toast({ title: t('created'), description: t('createdDescription') });
			}
			onOpenChange(false);
		} catch {
			toast({
				title: t('error'),
				description: t('saveError'),
				variant: 'destructive',
			});
		}
	};

	const isGA = providerType === 'google_analytics';

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
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="apiSecret">{t('apiSecret')}</Label>
								<Input
									id="apiSecret"
									type="password"
									placeholder={t('apiSecretPlaceholder')}
									value={apiSecret}
									onChange={(e) => setApiSecret(e.target.value)}
								/>
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
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="siteId">{t('siteId')}</Label>
								<Input
									id="siteId"
									placeholder="1"
									value={siteId}
									onChange={(e) => setSiteId(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="authToken">
									{t('authToken')} <span className="text-muted-foreground">({t('optional')})</span>
								</Label>
								<Input
									id="authToken"
									type="password"
									value={authToken}
									onChange={(e) => setAuthToken(e.target.value)}
								/>
							</div>
						</>
					)}

					<Alert>
						<ShieldCheckIcon className="size-4" />
						<AlertTitle>{t('privacyNoticeTitle')}</AlertTitle>
						<AlertDescription>{t('privacyNoticeDescription')}</AlertDescription>
					</Alert>
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
