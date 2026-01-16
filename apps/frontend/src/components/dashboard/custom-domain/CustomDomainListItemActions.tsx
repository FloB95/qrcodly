'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, Copy, Globe } from 'lucide-react';
import type { TCustomDomainResponseDto } from '@shared/schemas';
import { useSetupInstructionsQuery } from '@/lib/api/custom-domain';
import { toast } from '@/components/ui/use-toast';

interface CustomDomainListItemActionsProps {
	domain: TCustomDomainResponseDto;
	isDeleting: boolean;
	isVerifying: boolean;
	isVerifyingCname: boolean;
	isSettingDefault: boolean;
	onDelete: () => void;
	onVerify: () => void;
	onVerifyCname: () => void;
	onSetDefault: () => void;
}

export function CustomDomainListItemActions({
	domain,
	isDeleting,
	isVerifying,
	isVerifyingCname,
	isSettingDefault,
	onDelete,
	onVerify,
	onVerifyCname,
	onSetDefault,
}: CustomDomainListItemActionsProps) {
	const t = useTranslations('settings.domains');
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);

	const { data: instructions } = useSetupInstructionsQuery(domain.id);

	const handleCopyTxtValue = () => {
		if (instructions) {
			navigator.clipboard.writeText(instructions.txtRecord.recordValue);
			toast({
				title: t('copied'),
				description: t('copiedTxtDescription'),
			});
		}
	};

	const handleCopyCnameValue = () => {
		if (instructions) {
			navigator.clipboard.writeText(instructions.cnameRecord.recordValue);
			toast({
				title: t('copied'),
				description: t('copiedCnameDescription'),
			});
		}
	};

	// Domain is fully ready when both TXT and CNAME are verified
	const isFullyVerified = domain.isVerified && domain.isCnameValid;
	// Can set as default only if fully verified and not already default
	const canSetDefault = isFullyVerified && !domain.isDefault;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">{t('openMenu')}</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => setShowInstructionsDialog(true)}>
						{t('viewInstructions')}
					</DropdownMenuItem>

					{!domain.isVerified && (
						<DropdownMenuItem onClick={onVerify} disabled={isVerifying}>
							{t('verifyTxt')}
						</DropdownMenuItem>
					)}

					{domain.isVerified && !domain.isCnameValid && (
						<DropdownMenuItem onClick={onVerifyCname} disabled={isVerifyingCname}>
							{t('verifyCname')}
						</DropdownMenuItem>
					)}

					{canSetDefault && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onSetDefault} disabled={isSettingDefault}>
								{t('setAsDefault')}
							</DropdownMenuItem>
						</>
					)}

					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => setShowDeleteDialog(true)}
						disabled={isDeleting}
						className="text-destructive focus:text-destructive"
					>
						{t('delete')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
						<DialogDescription>
							{t('deleteConfirmDescription', { domain: domain.domain })}
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
								onDelete();
							}}
						>
							{t('delete')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Setup Instructions Dialog */}
			<Dialog open={showInstructionsDialog} onOpenChange={setShowInstructionsDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t('setupInstructions')}</DialogTitle>
						<DialogDescription>
							{t('setupInstructionsDescription', { domain: domain.domain })}
						</DialogDescription>
					</DialogHeader>
					{instructions && (
						<div className="space-y-6">
							{/* Step 1: TXT Record */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div
										className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
											domain.isVerified ? 'bg-green-200 text-green-800' : 'bg-black text-muted'
										}`}
									>
										1
									</div>
									<h4 className="font-medium">
										{t('txtRecordStep')}{' '}
										{domain.isVerified && (
											<CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
										)}
									</h4>
								</div>
								<div className="rounded-lg border p-4 space-y-3 ml-8">
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											{t('recordType')}
										</label>
										<p className="font-mono">{instructions.txtRecord.recordType}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											{t('recordHost')}
										</label>
										<p className="font-mono text-sm break-all">
											{instructions.txtRecord.recordHost}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											{t('recordValue')}
										</label>
										<div className="flex items-center gap-2">
											<p className="font-mono text-sm break-all flex-1">
												{instructions.txtRecord.recordValue}
											</p>
											<Button variant="outline" size="sm" onClick={handleCopyTxtValue}>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							</div>

							{/* Step 2: CNAME Record */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div
										className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
											domain.isCnameValid ? 'bg-green-200 text-green-800' : 'bg-black text-muted'
										}`}
									>
										2
									</div>
									<h4 className="font-medium">
										{t('cnameRecordStep')}{' '}
										{domain.isCnameValid && (
											<CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
										)}
									</h4>
								</div>
								<div className="rounded-lg border p-4 space-y-3 ml-8">
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											{t('recordType')}
										</label>
										<p className="font-mono">{instructions.cnameRecord.recordType}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											{t('recordHost')}
										</label>
										<p className="font-mono text-sm break-all">
											{instructions.cnameRecord.recordHost}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											{t('pointsTo')}
										</label>
										<div className="flex items-center gap-2">
											<p className="font-mono text-sm break-all flex-1">
												{instructions.cnameRecord.recordValue}
											</p>
											<Button variant="outline" size="sm" onClick={handleCopyCnameValue}>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							</div>

							<p className="text-sm text-muted-foreground">{t('dnsNote')}</p>
						</div>
					)}
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setShowInstructionsDialog(false)}>
							{t('close')}
						</Button>
						{!domain.isVerified && (
							<Button onClick={onVerify} disabled={isVerifying}>
								<CheckCircle className="mr-2 h-4 w-4" />
								{t('verifyTxt')}
							</Button>
						)}
						{domain.isVerified && !domain.isCnameValid && (
							<Button onClick={onVerifyCname} disabled={isVerifyingCname}>
								<Globe className="mr-2 h-4 w-4" />
								{t('verifyCname')}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
