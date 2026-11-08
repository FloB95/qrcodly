'use client';

import * as React from 'react';
import { Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';
import type { THostedUploadKind, THostedUploadResponseDto } from '@shared/schemas';
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadItemProgress,
	FileUploadList,
	FileUploadTrigger,
	type FileUploadProps,
} from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useUploadHostedFileMutation } from '@/lib/api/hosted-page';
import type { ApiError } from '@/lib/api/ApiError';
import { formatBytes } from '@/components/hosted-page/format';

type HostedFileDropzoneProps = {
	kind: THostedUploadKind;
	accept: string;
	maxSize: number;
	hint: string;
	/** The file in place; `size` only where it is known (documents), images show none */
	current: { name: string; size?: number; url?: string | null } | null;
	onUploaded: (upload: THostedUploadResponseDto) => void;
	onRemove: () => void;
	disabled?: boolean;
};

/** Uploads straight to the hosted-page endpoint and reports progress while it happens. */
export function HostedFileDropzone({
	kind,
	accept,
	maxSize,
	hint,
	current,
	onUploaded,
	onRemove,
	disabled,
}: HostedFileDropzoneProps) {
	const t = useTranslations('generator.contentSwitch.hosted.file');
	const tUpload = useTranslations('fileUpload');
	const [files, setFiles] = React.useState<File[]>([]);
	const upload = useUploadHostedFileMutation();

	const onUpload: NonNullable<FileUploadProps['onUpload']> = React.useCallback(
		async (selected, { onProgress, onSuccess, onError }) => {
			const file = selected[0];
			if (!file) return;
			try {
				const result = await upload.mutateAsync({
					file,
					kind,
					onProgress: (percent) => onProgress(file, percent),
				});
				onSuccess(file);
				onUploaded(result);
				setFiles([]);
			} catch (e) {
				const error = e as ApiError;
				onError(file, error);
				toast({ variant: 'destructive', title: t('uploadFailed'), description: error.message });
				setFiles([]);
			}
		},
		[upload, kind, onUploaded, t],
	);

	const Icon = kind === 'pdf' ? DocumentIcon : PhotoIcon;

	return (
		<FileUpload
			value={files}
			onValueChange={setFiles}
			onUpload={onUpload}
			onFileReject={(_, message) => toast({ variant: 'destructive', title: message })}
			maxFiles={1}
			accept={accept}
			maxSize={maxSize}
			disabled={disabled}
			className="w-full"
		>
			{current && files.length === 0 ? (
				<div className="flex items-center gap-3 rounded-lg border bg-white p-3">
					{kind === 'image' && current.url ? (
						// eslint-disable-next-line @next/next/no-img-element -- storage CDN preview
						<img src={current.url} alt="" className="size-12 rounded-full object-cover" />
					) : (
						<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
							<Icon className="size-6 text-muted-foreground" />
						</div>
					)}
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{current.name}</p>
						{current.size !== undefined && (
							<p className="text-xs text-muted-foreground">{formatBytes(current.size)}</p>
						)}
					</div>
					<FileUploadTrigger asChild>
						<Button type="button" variant="outline" size="sm" disabled={disabled}>
							{t('replace')}
						</Button>
					</FileUploadTrigger>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={onRemove}
						disabled={disabled}
						aria-label={t('remove')}
					>
						<X className="size-4" />
					</Button>
				</div>
			) : (
				<FileUploadDropzone className="bg-white/60">
					<div className="flex flex-col items-center gap-1 text-center">
						<div className="flex items-center justify-center rounded-full border p-2.5">
							<Upload className="size-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium">{t('dragDrop')}</p>
						<p className="text-xs text-muted-foreground">{hint}</p>
					</div>
					<FileUploadTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-2 w-fit"
							disabled={disabled}
						>
							{tUpload('uploadZone.browse')}
						</Button>
					</FileUploadTrigger>
				</FileUploadDropzone>
			)}

			<FileUploadList>
				{files.map((file) => (
					<FileUploadItem key={file.name} value={file} className="flex-col">
						<div className="flex w-full items-center gap-2">
							<FileUploadItemPreview />
							<FileUploadItemMetadata />
						</div>
						<FileUploadItemProgress />
					</FileUploadItem>
				))}
			</FileUploadList>
		</FileUpload>
	);
}
