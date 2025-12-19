'use client';

import { Upload, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadItemProgress,
	FileUploadList,
	FileUploadTrigger,
	type FileUploadProps,
} from '@/components/ui/file-upload';
import { toast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';

type FileUploaderProps = {
	value: File[];
	onValueChange: (files: File[]) => void;
	maxFiles?: number;
	accept?: string;
};

export const FileUploader = ({ value, onValueChange, maxFiles = 1, accept }: FileUploaderProps) => {
	const t = useTranslations('fileUpload');

	const onUpload: NonNullable<FileUploadProps['onUpload']> = React.useCallback(
		async (files, { onProgress, onSuccess, onError }) => {
			try {
				const uploadPromises = files.map(async (file) => {
					try {
						const totalChunks = 10;
						let uploadedChunks = 0;

						for (let i = 0; i < totalChunks; i++) {
							await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 100));
							uploadedChunks++;
							const progress = (uploadedChunks / totalChunks) * 100;
							onProgress(file, progress);
						}

						await new Promise((resolve) => setTimeout(resolve, 500));
						onSuccess(file);
					} catch (error) {
						onError(file, error instanceof Error ? error : new Error('Upload failed'));
					}
				});

				await Promise.all(uploadPromises);
			} catch (error) {
				console.error('Unexpected error during upload:', error);
			}
		},
		[],
	);

	const onFileReject = React.useCallback(
		(file: File, message: string) => {
			toast({
				title: message,
				// description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" ${t(
				// 	'upload.rejected',
				// )}`,
				variant: 'destructive',
				duration: 5000,
			});
		},
		[t],
	);

	return (
		<FileUpload
			value={value}
			onValueChange={onValueChange}
			onUpload={onUpload}
			onFileReject={onFileReject}
			maxFiles={maxFiles}
			accept={accept}
			className="w-full"
			maxSize={2 * 1024 * 1024} // 2MB
		>
			<FileUploadDropzone>
				<div className="flex flex-col items-center gap-1 text-center">
					<div className="flex items-center justify-center rounded-full border p-2.5">
						<Upload className="size-6 text-muted-foreground" />
					</div>
					<p className="font-medium text-sm">{t('uploadZone.dragDrop')}</p>
					<p className="text-muted-foreground text-xs">{t('uploadZone.or')}</p>
				</div>
				<FileUploadTrigger asChild>
					<Button variant="outline" size="sm" className="mt-2 w-fit">
						{t('uploadZone.browse')}
					</Button>
				</FileUploadTrigger>
			</FileUploadDropzone>

			<FileUploadList>
				{value.map((file, index) => (
					<FileUploadItem key={index} value={file} className="flex-col">
						<div className="flex w-full items-center gap-2">
							<FileUploadItemPreview />
							<FileUploadItemMetadata />
							<FileUploadItemDelete asChild>
								<Button variant="ghost" size="icon" className="size-7">
									<X />
								</Button>
							</FileUploadItemDelete>
						</div>
						<FileUploadItemProgress />
					</FileUploadItem>
				))}
			</FileUploadList>
		</FileUpload>
	);
};
