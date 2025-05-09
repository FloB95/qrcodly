import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useUpdateShortUrlMutation } from '@/lib/api/url-shortener';
import { ArrowTurnDownRightIcon } from '@heroicons/react/24/outline';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import posthog from 'posthog-js';
import { useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const UrlContent = ({
	qrCode,
	isEditMode,
}: {
	qrCode: TQrCodeWithRelationsResponseDto;
	isEditMode: boolean;
}) => {
	const t = useTranslations();
	const isShortUrl = qrCode?.shortUrl?.destinationUrl !== undefined;
	const destinationUrl =
		qrCode?.shortUrl?.destinationUrl ??
		(typeof qrCode.content.data === 'object' && 'url' in qrCode.content.data
			? qrCode.content.data.url
			: '');
	const [updateValue, setUpdateValue] = useState<string>(destinationUrl);
	const [debounced] = useDebouncedValue<string | null>(updateValue, 500);
	const updateShortUrlMutation = useUpdateShortUrlMutation();

	const handleUpdate = useCallback(() => {
		if (!qrCode?.shortUrl) return;

		const oldDestinationUrl = qrCode.shortUrl.destinationUrl;
		qrCode.shortUrl.destinationUrl = debounced;

		updateShortUrlMutation.mutate(
			{ shortCode: qrCode.shortUrl.shortCode, data: { destinationUrl: debounced } },
			{
				onSuccess: () => {
					posthog.capture('qr-code-link-updated', {
						shortCode: qrCode.shortUrl!.shortCode,
						data: {
							destinationUrl: debounced,
						},
					});
					toast({
						title: t('general.changesSaved'),
						duration: 2000,
						variant: 'success',
					});
				},
				onError: (error) => {
					qrCode.shortUrl!.destinationUrl = oldDestinationUrl;
					Sentry.captureException(error);
					toast({
						title: t('qrCode.error.update.title'),
						description: t('qrCode.error.update.message'),
						variant: 'destructive',
						duration: 5000,
					});
				},
			},
		);
	}, [qrCode.id, qrCode.shortUrl, debounced]);

	useEffect(() => {
		if (!qrCode?.shortUrl) return;

		if (debounced && debounced !== destinationUrl) {
			handleUpdate();
		}
	}, [debounced]);

	if (qrCode.content.type !== 'url') return;

	return (
		<>
			{isEditMode && isShortUrl ? (
				<Input
					type="text"
					className="p-6 "
					placeholder={t('qrCode.updateQrCodeUrl')}
					required
					value={updateValue}
					onChange={(e) => {
						setUpdateValue(e.target.value);
					}}
				/>
			) : (
				<h2 className="mb-4 text-2xl font-bold">
					<a href={destinationUrl} target="_blank" rel="noopener noreferrer">
						{destinationUrl}
					</a>
				</h2>
			)}
			{isShortUrl && (
				<div
					className={`ml-2 flex items-center opacity-100 transition-opacity duration-300 ease-in-out ${
						isEditMode && isShortUrl ? 'mt-2' : ''
					}`}
				>
					<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold" />
					<Link
						href={qrCode.content.data.url}
						target="_blank"
						className="text-muted-foreground pt-1 text-md"
						prefetch={false}
					>
						{qrCode.content.data.url}
					</Link>
				</div>
			)}
		</>
	);
};
