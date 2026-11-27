'use client';

import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { ShortUrlAliasErrorCode } from '@shared/schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useSetShortUrlAliasMutation } from '@/lib/api/url-shortener';
import type { ApiError } from '@/lib/api/ApiError';
import { AliasField } from './AliasField';
import { canSaveAlias } from './alias-input-status';
import { useAliasInput } from './use-alias-input';

interface ShortUrlAliasDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shortCode: string;
	currentAlias: string | null;
	customDomain: { id: string; domain: string };
	onSaved?: () => void;
}

/** Sets the alias of a short URL, or replaces the one it has. */
export function ShortUrlAliasDialog({ open, onOpenChange, ...props }: ShortUrlAliasDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* mounted with the dialog, so the field starts from the current alias every time */}
			{open && <AliasDialogContent onClose={() => onOpenChange(false)} {...props} />}
		</Dialog>
	);
}

function AliasDialogContent({
	shortCode,
	currentAlias,
	customDomain,
	onSaved,
	onClose,
}: Omit<ShortUrlAliasDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
	const t = useTranslations('shortUrl.alias');
	const tGeneral = useTranslations('general');
	const alias = useAliasInput({ customDomainId: customDomain.id, currentAlias });
	const setAlias = useSetShortUrlAliasMutation();
	const address = (text: string) => `${customDomain.domain}/u/${text}`;

	const save = () => {
		setAlias.mutate(
			{ shortCode, alias: alias.value },
			{
				onSuccess: () => {
					posthog.capture('short-url-alias:set', { source: 'dialog', isChange: !!currentAlias });
					toast({ title: t('saved.title'), description: t('saved.description') });
					onSaved?.();
					onClose();
				},
				onError: (e) => {
					const error = e as ApiError;
					if (error.code === 0 || error.code >= 500) Sentry.captureException(error);
					toast({
						variant: 'destructive',
						title: t('error.title'),
						description: aliasErrorMessage(error, t, customDomain.domain),
					});
				},
			},
		);
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{currentAlias ? t('dialog.changeTitle') : t('dialog.setTitle')}</DialogTitle>
			</DialogHeader>
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					if (canSaveAlias(alias.status)) save();
				}}
			>
				<AliasField
					label={currentAlias ? t('dialog.newLabel') : t('label')}
					domain={customDomain.domain}
					value={alias.value}
					onChange={alias.setValue}
					status={alias.status}
				/>

				{currentAlias && (
					<div
						role="alert"
						className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/40"
					>
						<ExclamationTriangleIcon
							aria-hidden="true"
							className="size-5 shrink-0 text-amber-800 dark:text-amber-300"
						/>
						<div className="space-y-1 text-amber-900 dark:text-amber-100">
							<p className="font-semibold">{t('dialog.warningTitle')}</p>
							<p className="break-words">
								{t('dialog.warningText', { address: address(currentAlias) })}
							</p>
						</div>
					</div>
				)}

				<div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
					<p className="font-semibold">{t('dialog.unchangedTitle')}</p>
					<ul className="space-y-1 text-muted-foreground">
						{[
							t('dialog.unchangedShortUrl', { address: address(shortCode) }),
							t('dialog.unchangedQrCodes'),
							t('dialog.unchangedStatistics'),
						].map((line) => (
							<li key={line} className="flex gap-2">
								<LockClosedIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
								<span className="break-words">{line}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="flex justify-end gap-2">
					<Button type="button" variant="secondary" onClick={onClose}>
						{tGeneral('cancel')}
					</Button>
					<Button
						type="submit"
						disabled={!canSaveAlias(alias.status) || setAlias.isPending}
						isLoading={setAlias.isPending}
					>
						{currentAlias ? t('dialog.change') : t('dialog.save')}
					</Button>
				</div>
			</form>
		</DialogContent>
	);
}

/** What to tell someone whose alias the API refused. */
export function aliasErrorMessage(
	error: ApiError,
	t: ReturnType<typeof useTranslations<'shortUrl.alias'>>,
	domain: string,
): string {
	if (error.errorCode === ShortUrlAliasErrorCode.TAKEN) return t('taken', { domain });
	if (error.errorCode === ShortUrlAliasErrorCode.MATCHES_SHORT_CODE) return t('notAvailable');
	return t('error.generic');
}
