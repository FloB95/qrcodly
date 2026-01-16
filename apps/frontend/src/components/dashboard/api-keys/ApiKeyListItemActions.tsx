'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { MoreHorizontal } from 'lucide-react';

interface ApiKeyListItemActionsProps {
	apiKey: {
		id: string;
		name: string | null;
		revoked: boolean;
	};
	isRevoking: boolean;
	onRevoke: () => void;
}

export function ApiKeyListItemActions({
	apiKey,
	isRevoking,
	onRevoke,
}: ApiKeyListItemActionsProps) {
	const t = useTranslations('settings.apiKeys');
	const [showRevokeDialog, setShowRevokeDialog] = useState(false);

	if (apiKey.revoked) return null;

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
					<DropdownMenuItem
						onClick={() => setShowRevokeDialog(true)}
						className="text-destructive focus:text-destructive"
					>
						{t('revoke')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('revokeConfirmTitle')}</DialogTitle>
						<DialogDescription>
							{t('revokeConfirmDescription', {
								name: apiKey.name ?? t('unnamed'),
							})}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
							{t('cancel')}
						</Button>
						<Button
							variant="destructive"
							disabled={isRevoking}
							onClick={() => {
								setShowRevokeDialog(false);
								onRevoke();
							}}
						>
							{t('revoke')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
