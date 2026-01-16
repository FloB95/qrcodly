'use client';

import { useTranslations } from 'next-intl';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CustomDomainListItemActions } from './CustomDomainListItemActions';
import { useCustomDomainMutations } from './hooks/useCustomDomainMutations';
import type { TCustomDomainResponseDto } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CustomDomainListItemProps {
	domain: TCustomDomainResponseDto;
}

export function CustomDomainListItem({ domain }: CustomDomainListItemProps) {
	const t = useTranslations('settings.domains');
	const {
		isDeleting,
		isVerifying,
		isVerifyingCname,
		isSettingDefault,
		handleDelete,
		handleVerify,
		handleVerifyCname,
		handleSetDefault,
	} = useCustomDomainMutations(domain);

	const formattedDate = new Date(domain.createdAt).toLocaleDateString();

	// Domain is fully ready when both TXT and CNAME are verified
	const isFullyVerified = domain.isVerified && domain.isCnameValid;

	return (
		<TableRow
			className={cn(
				'transition-opacity duration-200 hover:bg-muted/40',
				isDeleting && 'opacity-50 pointer-events-none',
			)}
		>
			<TableCell className="font-medium">
				<div className="flex items-center gap-2">
					{domain.domain}
					{domain.isDefault && (
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
								{domain.isVerified ? (
									<CheckCircle className="h-4 w-4 text-green-500" />
								) : (
									<XCircle className="h-4 w-4 text-muted-foreground" />
								)}
								<span className="text-xs">TXT</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							{domain.isVerified ? t('txtVerified') : t('txtPending')}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger>
							<div className="flex items-center gap-1">
								{domain.isCnameValid ? (
									<CheckCircle className="h-4 w-4 text-green-500" />
								) : (
									<XCircle className="h-4 w-4 text-muted-foreground" />
								)}
								<span className="text-xs">CNAME</span>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							{domain.isCnameValid ? t('cnameVerified') : t('cnamePending')}
						</TooltipContent>
					</Tooltip>
				</div>
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
					isVerifyingCname={isVerifyingCname}
					isSettingDefault={isSettingDefault}
					onDelete={handleDelete}
					onVerify={handleVerify}
					onVerifyCname={handleVerifyCname}
					onSetDefault={handleSetDefault}
				/>
			</TableCell>
		</TableRow>
	);
}
