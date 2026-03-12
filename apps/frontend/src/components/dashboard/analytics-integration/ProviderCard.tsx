'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import {
	useUpdateAnalyticsIntegrationMutation,
	useDeleteAnalyticsIntegrationMutation,
	useTestAnalyticsIntegrationMutation,
} from '@/lib/api/analytics-integration';
import { ConfigureIntegrationDialog } from './ConfigureIntegrationDialog';
import { ProviderLogo } from './ProviderLogo';
import type { TAnalyticsIntegrationResponseDto, TProviderType } from '@shared/schemas';
import type { ApiError } from '@/lib/api/ApiError';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

interface ProviderCardProps {
	integration?: TAnalyticsIntegrationResponseDto;
	providerType: TProviderType;
	canConfigure: boolean;
	hasOtherIntegration: boolean;
	isProExpired?: boolean;
}

export function ProviderCard({
	integration,
	providerType,
	canConfigure,
	hasOtherIntegration,
	isProExpired,
}: ProviderCardProps) {
	const t = useTranslations('settings.integrations');
	const { toast } = useToast();
	const [configOpen, setConfigOpen] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const updateMutation = useUpdateAnalyticsIntegrationMutation();
	const deleteMutation = useDeleteAnalyticsIntegrationMutation();
	const testMutation = useTestAnalyticsIntegrationMutation();

	const isGA = providerType === 'google_analytics';
	const providerName = isGA ? 'Google Analytics 4' : 'Matomo';

	const handleToggle = async (enabled: boolean) => {
		if (!integration) return;
		try {
			await updateMutation.mutateAsync({
				id: integration.id,
				dto: { isEnabled: enabled },
			});
			posthog.capture('analytics-integration:toggled', { providerType, enabled });
			toast({
				title: enabled ? t('enabled') : t('disabled'),
				description: enabled ? t('enabledDescription') : t('disabledDescription'),
			});
		} catch (e: unknown) {
			const error = e as ApiError;
			if (error.code >= 500) {
				Sentry.captureException(error, { extra: { providerType, enabled } });
			}
			posthog.capture('error:analytics-integration-toggle', {
				providerType,
				error: { code: error.code, message: error.message },
			});
			toast({ title: t('error'), description: t('toggleError'), variant: 'destructive' });
		}
	};

	const handleDelete = async () => {
		if (!integration) return;
		try {
			await deleteMutation.mutateAsync(integration.id);
			posthog.capture('analytics-integration:deleted', { providerType });
			toast({ title: t('deleted'), description: t('deletedDescription') });
		} catch (e: unknown) {
			const error = e as ApiError;
			if (error.code >= 500) {
				Sentry.captureException(error, { extra: { providerType } });
			}
			posthog.capture('error:analytics-integration-delete', {
				providerType,
				error: { code: error.code, message: error.message },
			});
			toast({ title: t('error'), description: t('deleteError'), variant: 'destructive' });
		}
	};

	const handleTest = async () => {
		if (!integration) return;
		try {
			const result = await testMutation.mutateAsync(integration.id);
			posthog.capture('analytics-integration:tested', {
				providerType,
				valid: result.valid,
				credentialsVerified: result.credentialsVerified,
			});
			if (!result.credentialsVerified) {
				toast({
					title: t('testUnverifiable'),
					description: t('testUnverifiableDescription'),
				});
			} else if (result.valid) {
				toast({
					title: t('testSuccess'),
					description: t('testSuccessDescription'),
				});
			} else {
				toast({
					title: t('testFailed'),
					description: t('testFailedDescription'),
					variant: 'destructive',
				});
			}
		} catch (e: unknown) {
			const error = e as ApiError;
			if (error.code >= 500) {
				Sentry.captureException(error, { extra: { providerType } });
			}
			posthog.capture('error:analytics-integration-test', {
				providerType,
				error: { code: error.code, message: error.message },
			});
			toast({ title: t('error'), description: t('testError'), variant: 'destructive' });
		}
	};

	// Integration exists: show configured card
	if (integration) {
		return (
			<>
				<Item variant="outline">
					<ProviderLogo providerType={providerType} className="size-8 shrink-0" />
					<ItemContent>
						<ItemTitle>
							{providerName}
							{integration.isEnabled ? (
								<Badge variant="blue" className="text-xs">
									{t('active')}
								</Badge>
							) : (
								<Badge variant="outline" className="text-xs">
									{t('inactive')}
								</Badge>
							)}
						</ItemTitle>
						<ItemDescription>
							{integration.displayIdentifier ? (
								<span className="font-mono text-xs">{integration.displayIdentifier}</span>
							) : (
								<>{isGA ? t('ga4Short') : t('matomoShort')}</>
							)}
							{integration.lastError && (
								<span className="text-destructive">
									{' '}
									&middot; {t('lastErrorTitle')}: {integration.lastError}
								</span>
							)}
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch
							size="sm"
							aria-label={providerName}
							checked={integration.isEnabled}
							onCheckedChange={handleToggle}
							disabled={updateMutation.isPending || isProExpired}
						/>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="h-8 w-8 p-0">
									<span className="sr-only">{t('openMenu')}</span>
									<EllipsisVerticalIcon className="size-6" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{!isProExpired && (
									<>
										<DropdownMenuItem onClick={() => setConfigOpen(true)}>
											{t('edit')}
										</DropdownMenuItem>
										{!isGA && (
											<DropdownMenuItem onClick={handleTest} disabled={testMutation.isPending}>
												{testMutation.isPending ? t('testing') : t('test')}
											</DropdownMenuItem>
										)}
										<DropdownMenuSeparator />
									</>
								)}
								<DropdownMenuItem
									onClick={() => setShowDeleteDialog(true)}
									className="text-destructive focus:text-destructive"
								>
									{t('delete')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</ItemActions>
				</Item>

				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
							<DialogDescription>
								{t('deleteConfirmDescription', { provider: providerName })}
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
								{t('cancel')}
							</Button>
							<Button
								variant="destructive"
								onClick={() => {
									setShowDeleteDialog(false);
									handleDelete();
								}}
							>
								{t('delete')}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<ConfigureIntegrationDialog
					open={configOpen}
					onOpenChange={setConfigOpen}
					providerType={providerType}
					existing={integration}
				/>
			</>
		);
	}

	// No integration: show setup card
	return (
		<>
			<Item variant="outline">
				<ProviderLogo providerType={providerType} className="size-8 shrink-0" />
				<ItemContent>
					<ItemTitle>{providerName}</ItemTitle>
					<ItemDescription>{isGA ? t('ga4Short') : t('matomoShort')}</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setConfigOpen(true)}
						disabled={!canConfigure || hasOtherIntegration || isProExpired}
					>
						{t('configure')}
					</Button>
				</ItemActions>
			</Item>

			<ConfigureIntegrationDialog
				open={configOpen}
				onOpenChange={setConfigOpen}
				providerType={providerType}
			/>
		</>
	);
}
