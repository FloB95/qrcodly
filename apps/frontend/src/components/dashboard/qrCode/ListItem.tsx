'use client';

import { PencilIcon } from '@heroicons/react/24/solid';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EyeIcon } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useGetViewsFromShortCodeQuery } from '@/lib/api/url-shortener';
import { DynamicQrCode } from '@/components/qr-generator/DynamicQrCode';
import { isDynamic, type TQrCodeWithRelationsResponseDto, type TShortUrl } from '@shared/schemas';
import { QrCodeIcon } from './QrCodeIcon';
import { NameDialog } from '@/components/qr-generator/NameDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicBadge } from '@/components/qr-generator/DynamicBadge';
import { RenderContent } from './content-renderers/RenderContent';
import { QrCodeListItemActions } from './QrCodeListItemActions';
import { useQrCodeMutations } from './hooks/useQrCodeMutations';

const ViewComponent = ({ shortUrl }: { shortUrl: TShortUrl }) => {
	const t = useTranslations();
	const { data } = useGetViewsFromShortCodeQuery(shortUrl.shortCode);

	if (data?.views === undefined) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex items-center space-x-2">
					<span>{data.views}</span>
					<EyeIcon width={20} height={20} />
				</div>
			</TooltipTrigger>
			<TooltipContent side="top">
				{data.views} {t('analytics.totalViews')}
			</TooltipContent>
		</Tooltip>
	);
};

const getRowClassName = (isDeleting: boolean, isActive: boolean | undefined) => {
	if (isDeleting) return 'rounded-2xl !bg-muted/70';
	if (isActive === false) return 'rounded-2xl !bg-muted';
	return 'rounded-2xl from-white to-white/70 bg-gradient-to-br';
};

export const QrCodeListItem = ({ qr }: { qr: TQrCodeWithRelationsResponseDto }) => {
	const t = useTranslations();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const { isDeleting, handleToggle, handleDelete, handleUpdateName } = useQrCodeMutations(qr);

	const isDynamicQr = !!qr.shortUrl && isDynamic(qr.content);

	return (
		<>
			<TableRow className={getRowClassName(isDeleting, qr.shortUrl?.isActive)}>
				{/* QR Code Preview */}
				<TableCell className="rounded-l-lg max-w-50 pr-2">
					<div className="flex space-x-2 max-w-fit">
						<div className="ml-2 hidden sm:flex items-center">
							<QrCodeIcon type={qr.content.type} />
						</div>
						<div className="h-[100px] w-[100px] overflow-hidden">
							{qr.previewImage ? (
								<Image
									src={qr.previewImage}
									width={180}
									height={180}
									alt="QR code preview"
									loading="lazy"
								/>
							) : (
								<DynamicQrCode qrCode={qr} additionalStyles="max-h-[100px] max-w-[100px]" />
							)}
						</div>
					</div>
				</TableCell>

				{/* Dynamic Badge */}
				{isDynamicQr && (
					<TableCell>
						<DynamicBadge className="py-1" />
					</TableCell>
				)}

				{/* Name */}
				<TableCell colSpan={isDynamicQr ? 1 : 2} className="font-medium max-w-[400px] truncate">
					<div
						className="group relative pr-6 inline-block"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setNameDialogOpen(true);
						}}
					>
						{qr.name && qr.name !== '' ? (
							qr.name
						) : (
							<span className="text-muted-foreground">{t('general.noName')}</span>
						)}
						<div className="ml-2 group-hover:block pointer-events-none group-hover:pointer-events-auto hidden">
							<Button size="icon" variant="ghost" className="absolute right-0 top-0 w-4 h-4">
								<PencilIcon className="w-full h-full" />
							</Button>
						</div>
					</div>
				</TableCell>

				{/* Content */}
				<TableCell className="font-medium max-w-[300px] truncate">
					<div className="overflow-hidden">
						<RenderContent qr={qr} />
					</div>
				</TableCell>

				{/* Status Badge */}
				<TableCell className="hidden sm:table-cell">
					{qr.shortUrl && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Badge variant={qr.shortUrl.isActive ? 'default' : 'outline'}>
									{qr.shortUrl.isActive ? t('analytics.stateActive') : t('analytics.stateInactive')}
								</Badge>
							</TooltipTrigger>
							<TooltipContent side="top">
								{qr.shortUrl.isActive
									? t('analytics.activeDescription')
									: t('analytics.inactiveDescription')}
							</TooltipContent>
						</Tooltip>
					)}
				</TableCell>

				{/* Views */}
				<TableCell>{qr.shortUrl && <ViewComponent shortUrl={qr.shortUrl} />}</TableCell>

				{/* Created Date */}
				<TableCell className="hidden md:table-cell">{formatDate(qr.createdAt)}</TableCell>

				{/* Actions */}
				<TableCell className="rounded-r-lg">
					<QrCodeListItemActions
						qr={qr}
						isDeleting={isDeleting}
						showDeleteConfirm={showDeleteConfirm}
						setShowDeleteConfirm={setShowDeleteConfirm}
						onToggle={handleToggle}
						onDelete={handleDelete}
					/>
				</TableCell>
			</TableRow>

			<NameDialog
				dialogHeadline={t('qrCode.updateQrCodeName.title')}
				placeholder={t('qrCode.updateQrCodeName.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleUpdateName}
				defaultValue={qr.name ?? ''}
			/>
		</>
	);
};

export const SkeletonListItem = () => {
	return (
		<TableRow className="shadow">
			<TableCell colSpan={6} className="rounded-l-lg p-0">
				<Skeleton className="h-[122px] w-full bg-white/70" />
			</TableCell>
		</TableRow>
	);
};
