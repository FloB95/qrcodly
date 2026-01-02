import type { TConfigTemplateResponseDto, TQrCode } from '@shared/schemas';
import { DynamicQrCode } from '../DynamicQrCode';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useCallback, useMemo, useState } from 'react';
import { useDeleteConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { fetchImageAsBase64 } from '@/lib/utils';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertDialogAction } from '@radix-ui/react-alert-dialog';
import React from 'react';
import * as Sentry from '@sentry/nextjs';

type TemplateListProps = {
	templates: TConfigTemplateResponseDto[];
	onSelect: (data: TConfigTemplateResponseDto) => void;
	deletable?: boolean;
};

const TemplateCard = React.memo(
	({
		template,
		onSelect,
		deletable,
		onDeleteClick,
	}: {
		template: TConfigTemplateResponseDto;
		onSelect: () => void;
		deletable: boolean;
		onDeleteClick: () => void;
	}) => {
		const qrCodeData = useMemo<Pick<TQrCode, 'config' | 'content'>>(
			() => ({
				config: template.config,
				content: {
					type: 'url',
					data: {
						url: 'https://www.qrcodly.de/',
						isEditable: false,
					},
				},
			}),
			[template.config],
		);

		return (
			<div onClick={onSelect} className="group relative">
				<Tooltip>
					<TooltipTrigger asChild>
						<p className="mb-1 truncate text-sm font-semibold">{template.name}</p>
					</TooltipTrigger>
					<TooltipContent side="top">{template.name}</TooltipContent>
				</Tooltip>
				<div className="relative overflow-hidden">
					{template.previewImage ? (
						<Image
							height={300}
							width={300}
							src={template.previewImage}
							alt="QR code preview"
							loading="lazy"
						/>
					) : (
						<DynamicQrCode qrCode={qrCodeData} />
					)}
					{deletable && (
						<Button
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteClick();
							}}
							className="absolute right-3 -bottom-1 h-8 w-8 -translate-y-1/2 scale-75 transform cursor-pointer opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
						>
							<TrashIcon className="h-6 w-6" />
						</Button>
					)}
				</div>
			</div>
		);
	},
	// Custom equality function - only re-render if template.id or deletable changes
	(prev, next) => prev.template.id === next.template.id && prev.deletable === next.deletable,
);

TemplateCard.displayName = 'TemplateCard';

export const TemplatesList = ({ templates, onSelect, deletable }: TemplateListProps) => {
	const trans = useTranslations('templates');
	const [selectedTemplate, setSelectedTemplate] = useState<TConfigTemplateResponseDto | null>(null);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const deleteTemplateMutation = useDeleteConfigTemplateMutation();

	const handleSelect = useCallback(
		async (template: TConfigTemplateResponseDto) => {
			try {
				if (template.config.image) {
					template.config.image = await fetchImageAsBase64(template.config.image);
				}
				onSelect(template);
				posthog.capture('config-template-selected', {
					id: template.id,
					templateName: template.name,
				});
			} catch (error) {
				console.error('Failed to convert image to base64:', error);
			}
		},
		[onSelect],
	);

	const handleDelete = useCallback(() => {
		if (!selectedTemplate) return;

		setIsDeleting(true);
		const t = toast({
			title: trans('delete.beingDeleted'),
			open: isDeleting,
			description: (
				<div className="flex space-x-2">
					<Loader2 className="mr-2 h-6 w-6 animate-spin" />{' '}
					<span>{trans('delete.deletingInfo')}</span>
				</div>
			),
		});

		deleteTemplateMutation.mutate(selectedTemplate.id, {
			onSuccess: () => {
				t.dismiss();
				setIsDeleting(false);
				setSelectedTemplate(null);
				posthog.capture('config-template-deleted', {
					id: selectedTemplate.id,
					templateName: selectedTemplate.name,
				});
			},
			onError: (error) => {
				Sentry.captureException(error);
				t.dismiss();
				toast({
					title: trans('delete.errorTitle'),
					description: trans('delete.errorDescription'),
					variant: 'destructive',
					duration: 5000,
				});
				setIsDeleting(false);
				setSelectedTemplate(null);
			},
		});
	}, [selectedTemplate, isDeleting]);

	return (
		<div className="grid h-[400px] cursor-pointer grid-cols-2 gap-4 overflow-y-auto px-2 lg:grid-cols-3">
			{templates.map((template) => (
				<React.Fragment key={template.id}>
					<TemplateCard
						template={template}
						onSelect={() => handleSelect(template)}
						deletable={!!deletable}
						onDeleteClick={() => setSelectedTemplate(template)}
					/>
					{deletable && selectedTemplate?.id === template.id && (
						<AlertDialog open={true} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{trans('confirmPopup.title')}</AlertDialogTitle>
									<AlertDialogDescription>
										{trans('confirmPopup.description')}{' '}
										<span className="font-bold text-black">{selectedTemplate.name}</span> ?<br />
										{trans('confirmPopup.description2')}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel asChild>
										<Button variant="secondary" onClick={() => setSelectedTemplate(null)}>
											{trans('confirmPopup.cancelBtn')}
										</Button>
									</AlertDialogCancel>
									<AlertDialogAction asChild>
										<Button variant="destructive" onClick={() => handleDelete()}>
											{trans('confirmPopup.confirmBtn')}
										</Button>
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</React.Fragment>
			))}
		</div>
	);
};
