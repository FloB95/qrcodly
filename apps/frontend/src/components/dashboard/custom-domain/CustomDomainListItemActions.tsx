'use client';

import { useState, useEffect } from 'react';
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
import { CheckCircle, Copy, RefreshCw } from 'lucide-react';
import type { TCustomDomainResponseDto } from '@shared/schemas';
import { useSetupInstructionsQuery } from '@/lib/api/custom-domain';
import { toast } from '@/components/ui/use-toast';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

interface CustomDomainListItemActionsProps {
	domain: TCustomDomainResponseDto;
	isDeleting: boolean;
	isVerifying: boolean;
	isSettingDefault: boolean;
	onDelete: () => void;
	onVerify: () => void;
	onSetDefault: () => void;
	autoShowInstructions?: boolean;
	onInstructionsShown?: () => void;
}

export function CustomDomainListItemActions({
	domain,
	isDeleting,
	isVerifying,
	isSettingDefault,
	onDelete,
	onVerify,
	onSetDefault,
	autoShowInstructions,
	onInstructionsShown,
}: CustomDomainListItemActionsProps) {
	const t = useTranslations('settings.domains');
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
	const [hasAutoShown, setHasAutoShown] = useState(false);

	const { data: instructions, refetch: refetchInstructions } = useSetupInstructionsQuery(domain.id);

	// Auto-open instructions dialog if requested (e.g., after domain creation)
	useEffect(() => {
		if (autoShowInstructions && !showInstructionsDialog && !hasAutoShown) {
			setShowInstructionsDialog(true);
			setHasAutoShown(true);
			onInstructionsShown?.();
		}
	}, [autoShowInstructions, showInstructionsDialog, onInstructionsShown, hasAutoShown]);

	// Automatically refresh instructions when dialog opens
	useEffect(() => {
		if (showInstructionsDialog) {
			void refetchInstructions();
		}
	}, [showInstructionsDialog, refetchInstructions]);

	const handleCopy = (text: string, descriptionKey: string) => {
		navigator.clipboard.writeText(text);
		toast({
			title: t('copied'),
			description: t(descriptionKey),
		});
	};

	const handleCopySslHost = () => {
		if (instructions?.sslValidationRecord) {
			handleCopy(instructions.sslValidationRecord.recordHost, 'copiedHostDescription');
		}
	};

	const handleCopySslValue = () => {
		if (instructions?.sslValidationRecord) {
			handleCopy(instructions.sslValidationRecord.recordValue, 'copiedTxtDescription');
		}
	};

	const handleCopyOwnershipHost = () => {
		if (instructions?.ownershipValidationRecord) {
			handleCopy(instructions.ownershipValidationRecord.recordHost, 'copiedHostDescription');
		}
	};

	const handleCopyOwnershipValue = () => {
		if (instructions?.ownershipValidationRecord) {
			handleCopy(instructions.ownershipValidationRecord.recordValue, 'copiedTxtDescription');
		}
	};

	const handleCopyCnameHost = () => {
		if (instructions) {
			handleCopy(instructions.cnameRecord.recordHost, 'copiedHostDescription');
		}
	};

	const handleCopyCnameValue = () => {
		if (instructions) {
			handleCopy(instructions.cnameRecord.recordValue, 'copiedCnameDescription');
		}
	};

	// Domain is fully ready when SSL is active
	const isFullyVerified = domain.sslStatus === 'active';
	// Still needs verification if SSL is not active
	const needsVerification = domain.sslStatus !== 'active';
	// Can set as default only if fully verified and not already default
	const canSetDefault = isFullyVerified && !domain.isDefault;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">{t('openMenu')}</span>
						<EllipsisVerticalIcon className="size-6" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => setShowInstructionsDialog(true)}>
						{t('viewInstructions')}
					</DropdownMenuItem>

					{needsVerification && (
						<DropdownMenuItem onClick={onVerify} disabled={isVerifying}>
							{t('checkStatus')}
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
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{t('setupInstructions')}</DialogTitle>
						<DialogDescription>
							{instructions?.phase === 'dns_verification'
								? t('setupInstructionsDescriptionDns', { domain: domain.domain })
								: t('setupInstructionsDescriptionSsl', { domain: domain.domain })}
						</DialogDescription>
					</DialogHeader>
					{instructions && (
						<div className="max-h-[65vh] overflow-y-auto space-y-6 pr-2">
							{/* Step 1: Ownership Validation TXT Record */}
							{instructions.ownershipValidationRecord && (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<div
											className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
												instructions.ownershipTxtVerified
													? 'bg-green-200 text-green-800'
													: 'bg-black text-muted'
											}`}
										>
											1
										</div>
										<h4 className="font-medium">
											{t('ownershipValidationStep')}{' '}
											{instructions.ownershipTxtVerified && (
												<CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
											)}
										</h4>
									</div>
									{/* Show record details in Phase 1, or collapsed in Phase 2 */}
									{instructions.phase === 'dns_verification' ? (
										<div className="rounded-lg border p-4 space-y-3 ml-8">
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													{t('recordType')}
												</label>
												<p className="font-mono">
													{instructions.ownershipValidationRecord.recordType}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													{t('recordHost')}
												</label>
												<div className="flex items-center gap-2">
													<p className="font-mono text-sm break-all flex-1">
														{instructions.ownershipValidationRecord.recordHost}
													</p>
													<Button variant="outline" size="sm" onClick={handleCopyOwnershipHost}>
														<Copy className="h-4 w-4" />
													</Button>
												</div>
											</div>
											<div>
												<label className="text-sm font-medium text-muted-foreground">
													{t('recordValue')}
												</label>
												<div className="flex items-center gap-2">
													<p className="font-mono text-sm break-all flex-1">
														{instructions.ownershipValidationRecord.recordValue}
													</p>
													<Button variant="outline" size="sm" onClick={handleCopyOwnershipValue}>
														<Copy className="h-4 w-4" />
													</Button>
												</div>
											</div>
										</div>
									) : (
										<p className="text-sm text-muted-foreground ml-8">{t('stepCompleted')}</p>
									)}
								</div>
							)}

							{/* Step 2: CNAME Record */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div
										className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
											instructions.cnameVerified
												? 'bg-green-200 text-green-800'
												: 'bg-black text-muted'
										}`}
									>
										2
									</div>
									<h4 className="font-medium">
										{t('cnameRecordStep')}{' '}
										{instructions.cnameVerified && (
											<CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
										)}
									</h4>
								</div>
								{/* Show record details in Phase 1, or collapsed in Phase 2 */}
								{instructions.phase === 'dns_verification' ? (
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
											<div className="flex items-center gap-2">
												<p className="font-mono text-sm break-all flex-1">
													{instructions.cnameRecord.recordHost}
												</p>
												<Button variant="outline" size="sm" onClick={handleCopyCnameHost}>
													<Copy className="h-4 w-4" />
												</Button>
											</div>
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
								) : (
									<p className="text-sm text-muted-foreground ml-8">{t('stepCompleted')}</p>
								)}
							</div>

							{/* Step 3: SSL Validation TXT Record (only in Phase 2) */}
							{instructions.phase === 'cloudflare_ssl' && instructions.sslValidationRecord && (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<div
											className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
												isFullyVerified ? 'bg-green-200 text-green-800' : 'bg-black text-muted'
											}`}
										>
											3
										</div>
										<h4 className="font-medium">
											{t('sslValidationStep')}{' '}
											{isFullyVerified && (
												<CheckCircle className="inline h-4 w-4 text-green-500 ml-1" />
											)}
										</h4>
									</div>
									<div className="rounded-lg border p-4 space-y-3 ml-8">
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												{t('recordType')}
											</label>
											<p className="font-mono">{instructions.sslValidationRecord.recordType}</p>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												{t('recordHost')}
											</label>
											<div className="flex items-center gap-2">
												<p className="font-mono text-sm break-all flex-1">
													{instructions.sslValidationRecord.recordHost}
												</p>
												<Button variant="outline" size="sm" onClick={handleCopySslHost}>
													<Copy className="h-4 w-4" />
												</Button>
											</div>
										</div>
										<div>
											<label className="text-sm font-medium text-muted-foreground">
												{t('recordValue')}
											</label>
											<div className="flex items-center gap-2">
												<p className="font-mono text-sm break-all flex-1">
													{instructions.sslValidationRecord.recordValue}
												</p>
												<Button variant="outline" size="sm" onClick={handleCopySslValue}>
													<Copy className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>
								</div>
							)}

							<p className="text-sm text-muted-foreground">{t('dnsNote')}</p>
						</div>
					)}
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setShowInstructionsDialog(false)}>
							{t('close')}
						</Button>
						{needsVerification && (
							<Button onClick={onVerify} disabled={isVerifying}>
								<RefreshCw className={`mr-2 h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
								{t('checkStatus')}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
