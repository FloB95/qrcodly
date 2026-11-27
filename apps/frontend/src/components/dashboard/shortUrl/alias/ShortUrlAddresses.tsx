'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LockClosedIcon, PencilIcon } from '@heroicons/react/24/outline';
import * as Sentry from '@sentry/nextjs';
import type { TShortUrlResponseDto, TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { useCustomDomainLookup } from '@/lib/api/custom-domain';
import { useSetShortUrlAliasMutation } from '@/lib/api/url-shortener';
import { createLinkFromShortUrl } from '@/lib/utils';
import { CopyUrlButton } from '../../qrCode/content-renderers/CopyUrlButton';
import { ShortUrlAliasDialog } from './ShortUrlAliasDialog';

interface ShortUrlAddressesProps {
	shortUrl: TShortUrlResponseDto | TShortUrlWithCustomDomainResponseDto;
	/** After the alias was saved or removed: the caller loads the short URL again. */
	onChanged: () => void;
	/** On a QR code the fixed address is the one the code contains. */
	isQrCode?: boolean;
}

/**
 * The two addresses of a short URL: the fixed one with its short code, and the alias on its custom
 * domain, which the owner sets, changes or removes here.
 */
export function ShortUrlAddresses({
	shortUrl,
	onChanged,
	isQrCode = false,
}: ShortUrlAddressesProps) {
	const t = useTranslations('shortUrl.alias');
	const tGeneral = useTranslations('general');
	const [dialogOpen, setDialogOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const removeAlias = useSetShortUrlAliasMutation();

	const customDomainId =
		'customDomain' in shortUrl ? (shortUrl.customDomain?.id ?? null) : shortUrl.customDomainId;
	const { domain: customDomain, isLoading } = useCustomDomainLookup(customDomainId);

	const link = (options: { alias?: boolean; short?: boolean }) =>
		createLinkFromShortUrl(shortUrl, { customDomain, ...options });

	const remove = () => {
		removeAlias.mutate(
			{ shortCode: shortUrl.shortCode, alias: null },
			{
				onSuccess: () => {
					toast({ title: t('removed') });
					setRemoveOpen(false);
					onChanged();
				},
				onError: (error) => {
					Sentry.captureException(error);
					toast({
						variant: 'destructive',
						title: t('error.title'),
						description: t('error.generic'),
					});
				},
			},
		);
	};

	return (
		<div className="space-y-4">
			<div>
				<div className="mb-1 flex items-center gap-2">
					<p className="text-sm font-medium text-muted-foreground">{t('addresses.shortUrl')}</p>
					<Badge variant="secondary" className="gap-1">
						<LockClosedIcon aria-hidden="true" className="size-3" />
						{t('addresses.fixed')}
					</Badge>
				</div>
				<div className="group/url flex items-center gap-2 [&_button]:opacity-100">
					<span className="text-sm font-medium break-all">{link({ short: true })}</span>
					<CopyUrlButton url={link({})} />
				</div>
				<p className="mt-1 text-sm text-muted-foreground">
					{isQrCode ? t('addresses.fixedHintQrCode') : t('addresses.fixedHint')}
				</p>
			</div>

			<Separator />

			<div>
				<div className="mb-1 flex items-center gap-2">
					<p className="text-sm font-medium text-muted-foreground">{t('label')}</p>
					{shortUrl.alias && customDomain && (
						<Badge variant="secondary" className="gap-1">
							<PencilIcon aria-hidden="true" className="size-3" />
							{t('addresses.changeable')}
						</Badge>
					)}
				</div>

				{!customDomainId && (
					<p className="max-w-2xl text-sm text-muted-foreground">{t('systemDomain')}</p>
				)}

				{customDomain && !shortUrl.alias && (
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="max-w-2xl text-sm text-muted-foreground">{t('addresses.none')}</p>
						<Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
							{t('addresses.set')}
						</Button>
					</div>
				)}

				{customDomain && shortUrl.alias && (
					<>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="group/url flex min-w-0 items-center gap-2 [&_button]:opacity-100">
								<span className="text-sm font-medium break-all">
									{link({ alias: true, short: true })}
								</span>
								<CopyUrlButton url={link({ alias: true })} />
							</div>
							<div className="flex items-center gap-2">
								<Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
									{t('addresses.change')}
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
									onClick={() => setRemoveOpen(true)}
								>
									{t('addresses.remove')}
								</Button>
							</div>
						</div>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							{t('addresses.aliasHint')}
						</p>
					</>
				)}

				{customDomainId && !customDomain && !isLoading && (
					<p className="text-sm text-muted-foreground">{t('systemDomain')}</p>
				)}
			</div>

			{customDomain && (
				<ShortUrlAliasDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					shortCode={shortUrl.shortCode}
					currentAlias={shortUrl.alias}
					customDomain={customDomain}
					onSaved={onChanged}
				/>
			)}

			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('remove.title')}</AlertDialogTitle>
						<AlertDialogDescription className="break-words">
							{t('remove.text', {
								address: link({ alias: true, short: true }),
								shortUrl: link({ short: true }),
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button variant="secondary">{tGeneral('cancel')}</Button>
						</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={removeAlias.isPending}
							isLoading={removeAlias.isPending}
							onClick={remove}
						>
							{t('remove.confirm')}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
