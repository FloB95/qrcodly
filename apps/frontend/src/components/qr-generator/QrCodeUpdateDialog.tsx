'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { DialogClose } from '@radix-ui/react-dialog';
import { Checkbox } from '../ui/checkbox';
import { useState } from 'react';
import posthog from 'posthog-js';
import { safeLocalStorage } from '@/lib/utils';

export const UPDATE_DIALOG_DO_NOT_SHOW_AGAIN_KEY = 'qrCodeUpdateInfoDialogDoNotShowAgain';

type TNameDialogProps = {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	onSubmit: () => void;
};
export function QrCodeUpdateDialog({ isOpen, setIsOpen, onSubmit }: TNameDialogProps) {
	const t = useTranslations('qrCode.update.infoDialog');
	const [doNotShowAgain, setDoNotShowAgain] = useState(false);

	const handleSubmit = () => {
		// TODO move to user settings
		if (doNotShowAgain) {
			safeLocalStorage.setItem(UPDATE_DIALOG_DO_NOT_SHOW_AGAIN_KEY, 'true');
			posthog.capture('qrcode.update.dontShowAgainChecked');
		}
		onSubmit();
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('dialogHeadline')}</DialogTitle>
				</DialogHeader>
				<p className="mb-2 sm:max-w-[400px] text-gray-600">{t('dialogDescription')}</p>
				<label className="flex flex-row items-start space-x-3 cursor-pointer">
					<Checkbox
						value={String(doNotShowAgain)}
						onCheckedChange={(checked) => setDoNotShowAgain(Boolean(checked))}
						className="cursor-pointer"
					/>
					<span className="text-sm text-gray-600 -mt-0.5">{t('doNotShowAgain')}</span>
				</label>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							{t('cancelBtn')}
						</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button type="button" onClick={() => handleSubmit()}>
							{t('understandBtn')}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
