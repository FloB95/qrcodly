'use client';

import { useTranslations } from 'next-intl';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useClearDefaultCustomDomainMutation } from '@/lib/api/custom-domain';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

interface SystemDomainListItemProps {
	systemDomain: string;
	isDefault: boolean;
}

export function SystemDomainListItem({ systemDomain, isDefault }: SystemDomainListItemProps) {
	const t = useTranslations('settings.domains');
	const clearDefaultMutation = useClearDefaultCustomDomainMutation();

	const handleSetAsDefault = () => {
		clearDefaultMutation.mutate(undefined, {
			onSuccess: () => {
				toast({
					title: t('defaultCleared'),
					description: t('defaultClearedDescription'),
				});
				posthog.capture('custom-domain:set-system-default');
			},
			onError: (error) => {
				toast({
					title: t('errorTitle'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
				posthog.capture('error:custom-domain-set-system-default', {
					errorMessage: error.message,
					errorName: error.name,
				});
			},
		});
	};

	return (
		<TableRow className="transition-opacity duration-200 hover:bg-muted/40 bg-muted/20">
			<TableCell className="font-medium">
				<div className="flex items-center gap-2">
					{systemDomain}
					<Badge variant="secondary" className="text-xs">
						{t('systemDomain')}
					</Badge>
					{isDefault && (
						<Badge variant="outline" className="text-xs gap-1">
							<Star className="h-3 w-3 fill-current" />
							{t('default')}
						</Badge>
					)}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger>
							<div className="flex items-center gap-1">
								<CheckCircle className="h-4 w-4 text-green-500" />
								<span className="text-xs">TXT</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>{t('systemDomainVerified')}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger>
							<div className="flex items-center gap-1">
								<CheckCircle className="h-4 w-4 text-green-500" />
								<span className="text-xs">CNAME</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>{t('systemDomainVerified')}</TooltipContent>
					</Tooltip>
				</div>
			</TableCell>
			<TableCell>
				<Badge variant="default">{t('ready')}</Badge>
			</TableCell>
			<TableCell className="text-muted-foreground">-</TableCell>
			<TableCell>
				{!isDefault && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleSetAsDefault}
						disabled={clearDefaultMutation.isPending}
					>
						{t('setAsDefault')}
					</Button>
				)}
			</TableCell>
		</TableRow>
	);
}
