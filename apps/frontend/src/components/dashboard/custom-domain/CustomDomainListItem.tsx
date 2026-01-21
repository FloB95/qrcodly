'use client';

import { useTranslations } from 'next-intl';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CustomDomainListItemActions } from './CustomDomainListItemActions';
import { useCustomDomainMutations } from './hooks/useCustomDomainMutations';
import type { TCustomDomainResponseDto } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StarIcon } from '@heroicons/react/24/solid';

interface CustomDomainListItemProps {
	domain: TCustomDomainResponseDto;
}

/**
 * Maps Cloudflare SSL status to display info.
 */
function getSslStatusInfo(sslStatus: string) {
	switch (sslStatus) {
		case 'active':
			return { icon: CheckCircle, color: 'text-green-500', label: 'active' };
		case 'pending_validation':
		case 'pending_issuance':
		case 'pending_deployment':
		case 'initializing':
			return { icon: Clock, color: 'text-yellow-500', label: 'pending' };
		case 'validation_timed_out':
		case 'expired':
		case 'deleted':
			return { icon: AlertCircle, color: 'text-red-500', label: 'error' };
		default:
			return { icon: Clock, color: 'text-muted-foreground', label: 'unknown' };
	}
}

export function CustomDomainListItem({ domain }: CustomDomainListItemProps) {
	const t = useTranslations('settings.domains');
	const {
		isDeleting,
		isVerifying,
		isSettingDefault,
		handleDelete,
		handleVerify,
		handleSetDefault,
	} = useCustomDomainMutations(domain);

	const formattedDate = new Date(domain.createdAt).toLocaleDateString();

	// Domain is fully ready when SSL is active
	const isFullyVerified = domain.sslStatus === 'active';

	const statusInfo = getSslStatusInfo(domain.sslStatus);
	const StatusIcon = statusInfo.icon;
	const hasValidationErrors = domain.validationErrors && domain.validationErrors.length > 0;

	return (
		<TableRow
			className={cn(
				'transition-opacity duration-200 hover:bg-muted/40',
				isDeleting && 'opacity-50 pointer-events-none',
			)}
		>
			<TableCell className="font-medium">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						{domain.domain}
						{domain.isDefault && (
							<Badge variant="outline" className="text-xs gap-1">
								<StarIcon className="h-3 w-3" />
								{t('default')}
							</Badge>
						)}
					</div>
					{hasValidationErrors && (
						<div className="flex items-center gap-1 text-xs text-destructive">
							<AlertCircle className="h-3 w-3" />
							<span>{domain.validationErrors?.join(', ')}</span>
						</div>
					)}
				</div>
			</TableCell>
			<TableCell>
				<Tooltip>
					<TooltipTrigger>
						<div className="flex items-center gap-1">
							<StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
							<span className="text-xs capitalize">{t(`sslStatus.${statusInfo.label}`)}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>{t(`sslStatusTooltip.${domain.sslStatus}`)}</TooltipContent>
				</Tooltip>
			</TableCell>
			<TableCell>
				<Badge variant={isFullyVerified ? 'default' : 'secondary'}>
					{isFullyVerified ? t('ready') : t('setup')}
				</Badge>
			</TableCell>
			<TableCell className="text-muted-foreground">{formattedDate}</TableCell>
			<TableCell>
				<CustomDomainListItemActions
					domain={domain}
					isDeleting={isDeleting}
					isVerifying={isVerifying}
					isSettingDefault={isSettingDefault}
					onDelete={handleDelete}
					onVerify={handleVerify}
					onSetDefault={handleSetDefault}
				/>
			</TableCell>
		</TableRow>
	);
}
