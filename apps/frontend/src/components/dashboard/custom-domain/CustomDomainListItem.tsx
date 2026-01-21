'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CustomDomainListItemActions } from './CustomDomainListItemActions';
import { useCustomDomainMutations } from './hooks/useCustomDomainMutations';
import type { TCustomDomainResponseDto } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { StarIcon } from '@heroicons/react/24/solid';

interface CustomDomainListItemProps {
	domain: TCustomDomainResponseDto;
}

/**
 * Maps verification phase and status to display info.
 */
function getVerificationStatusInfo(domain: TCustomDomainResponseDto) {
	// Fully verified - SSL is active
	if (domain.sslStatus === 'active') {
		return { icon: CheckCircle, color: 'text-green-500', label: 'active', badge: 'ready' };
	}

	// Phase 1: DNS verification
	if (domain.verificationPhase === 'dns_verification') {
		const verifiedCount = (domain.ownershipTxtVerified ? 1 : 0) + (domain.cnameVerified ? 1 : 0);
		if (verifiedCount === 0) {
			return { icon: Clock, color: 'text-yellow-500', label: 'dnsSetup', badge: 'dnsSetup' };
		}
		return {
			icon: Clock,
			color: 'text-yellow-500',
			label: 'dnsPartial',
			badge: 'dnsPartial',
			count: verifiedCount,
		};
	}

	// Phase 2: Cloudflare SSL
	if (domain.verificationPhase === 'cloudflare_ssl') {
		// Check for SSL errors
		if (
			domain.sslStatus === 'validation_timed_out' ||
			domain.sslStatus === 'expired' ||
			domain.sslStatus === 'deleted'
		) {
			return { icon: AlertCircle, color: 'text-red-500', label: 'error', badge: 'error' };
		}
		return { icon: Clock, color: 'text-yellow-500', label: 'sslPending', badge: 'sslPending' };
	}

	// Fallback
	return { icon: Clock, color: 'text-muted-foreground', label: 'unknown', badge: 'setup' };
}

export function CustomDomainListItem({ domain }: CustomDomainListItemProps) {
	const t = useTranslations('settings.domains');
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

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

	// Check if this domain should auto-show instructions (from URL param)
	const showInstructionsId = searchParams.get('showInstructions');
	const shouldAutoShowInstructions = showInstructionsId === domain.id;

	// Clear the URL param when instructions are shown
	const clearShowInstructionsParam = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete('showInstructions');
		const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
		router.replace(newUrl);
	};

	const statusInfo = getVerificationStatusInfo(domain);
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
				<div className="flex items-center gap-1">
					<StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
					<span className="text-xs">
						{statusInfo.label === 'dnsPartial' && 'count' in statusInfo
							? t('verificationStatus.dnsPartial', { count: statusInfo.count as number })
							: t(`verificationStatus.${statusInfo.label}`)}
					</span>
				</div>
			</TableCell>
			<TableCell>
				<Badge variant={isFullyVerified ? 'default' : 'secondary'}>
					{statusInfo.badge === 'dnsPartial' && 'count' in statusInfo
						? t('badge.dnsPartial', { count: statusInfo.count as number })
						: t(`badge.${statusInfo.badge}`)}
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
					autoShowInstructions={shouldAutoShowInstructions}
					onInstructionsShown={clearShowInstructionsParam}
				/>
			</TableCell>
		</TableRow>
	);
}
