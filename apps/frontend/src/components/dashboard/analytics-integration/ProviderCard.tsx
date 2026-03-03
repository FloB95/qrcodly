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
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

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
			toast({
				title: enabled ? t('enabled') : t('disabled'),
				description: enabled ? t('enabledDescription') : t('disabledDescription'),
			});
		} catch {
			toast({ title: t('error'), description: t('toggleError'), variant: 'destructive' });
		}
	};

	const handleDelete = async () => {
		if (!integration) return;
		try {
			await deleteMutation.mutateAsync(integration.id);
			toast({ title: t('deleted'), description: t('deletedDescription') });
		} catch {
			toast({ title: t('error'), description: t('deleteError'), variant: 'destructive' });
		}
	};

	const handleTest = async () => {
		if (!integration) return;
		try {
			const result = await testMutation.mutateAsync(integration.id);
			toast({
				title: result.valid ? t('testSuccess') : t('testFailed'),
				description: result.valid ? t('testSuccessDescription') : t('testFailedDescription'),
				variant: result.valid ? 'default' : 'destructive',
			});
		} catch {
			toast({ title: t('error'), description: t('testError'), variant: 'destructive' });
		}
	};

	// Integration exists: show configured card
	if (integration) {
		return (
			<>
				<Item variant="outline" className={isProExpired ? 'opacity-60' : undefined}>
					<ProviderLogo providerType={providerType} className="size-8 shrink-0" />
					<ItemContent>
						<ItemTitle>
							{providerName}
							{integration.isEnabled ? (
								<Badge
									variant="secondary"
									className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
								>
									{t('active')}
								</Badge>
							) : (
								<Badge variant="secondary">{t('inactive')}</Badge>
							)}
						</ItemTitle>
						<ItemDescription>
							{integration.displayIdentifier ? (
								<span className="font-mono text-xs">{integration.displayIdentifier}</span>
							) : (
								<>{isGA ? t('ga4Short') : t('matomoShort')}</>
							)}
							{integration.lastError && (
								<span className="text-destructive"> &middot; {t('lastErrorTitle')}</span>
							)}
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch
							size="sm"
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
										<DropdownMenuItem onClick={handleTest} disabled={testMutation.isPending}>
											{testMutation.isPending ? t('testing') : t('test')}
										</DropdownMenuItem>
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
						disabled={!canConfigure || hasOtherIntegration}
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
