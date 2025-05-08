import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ArrowTurnDownRightIcon } from '@heroicons/react/24/outline';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { useEffect, useState } from 'react';

export const UrlContent = ({
	qrCode,
	isEditMode,
}: {
	qrCode: TQrCodeWithRelationsResponseDto;
	isEditMode: boolean;
}) => {
	const isShortUrl = qrCode?.shortUrl?.destinationUrl !== undefined;
	const destinationUrl =
		qrCode?.shortUrl?.destinationUrl ??
		(typeof qrCode.content.data === 'object' && 'url' in qrCode.content.data
			? qrCode.content.data.url
			: '');
	const [updateValue, setUpdateValue] = useState<string>(destinationUrl);

	const [debounced] = useDebouncedValue<string | null>(updateValue, 1000);

	useEffect(() => {
		if (debounced && debounced !== destinationUrl) {
			toast({
				title: 'Changes saved',
				duration: 2000,
				variant: 'success',
			});
		}
	}, [debounced]);

	if (qrCode.content.type !== 'url') return;

	return (
		<>
			{isEditMode && isShortUrl ? (
				<Input
					type="text"
					className="p-6 "
					placeholder="Update your URL"
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
					<span className="text-muted-foreground pt-1 text-md">{qrCode.content.data.url}</span>
				</div>
			)}
		</>
	);
};
