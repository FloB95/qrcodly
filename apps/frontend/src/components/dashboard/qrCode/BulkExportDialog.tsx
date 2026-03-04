'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import type { TFileExtension, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader } from '@/components/ui/loader';
import { toast } from '@/components/ui/use-toast';
import { fetchQrCodesPage, useListQrCodesQuery } from '@/lib/api/qr-code';
import { getQrCodeStylingOptions } from '@/lib/qr-code-helpers';
import { getContentTypeConfig } from '@/lib/content-type.config';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { getPageNumbers } from '@/lib/utils';
import posthog from 'posthog-js';

const EXPORT_PAGE_LIMIT = 50;

const FILE_EXTENSIONS: { value: TFileExtension; label: string }[] = [
	{ value: 'png', label: 'PNG' },
	{ value: 'svg', label: 'SVG' },
	{ value: 'jpeg', label: 'JPG' },
	{ value: 'webp', label: 'WEBP' },
];

interface BulkExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function sanitizeFileName(name: string | null | undefined, id: string): string {
	if (!name || name.trim() === '') return id;
	return (
		name
			.replace(/[^a-zA-Z0-9\s_-]/g, '')
			.replace(/\s+/g, '_')
			.trim() || id
	);
}

function getUniqueFileName(existingNames: Set<string>, baseName: string, ext: string): string {
	let fileName = `${baseName}.${ext}`;
	let counter = 1;
	while (existingNames.has(fileName)) {
		fileName = `${baseName}_${counter}.${ext}`;
		counter++;
	}
	existingNames.add(fileName);
	return fileName;
}

async function generateQrCodeBlob(
	qr: TQrCodeWithRelationsResponseDto,
	fileExtension: TFileExtension,
	QRCodeStylingModule: any,
): Promise<Blob | null> {
	const options = getQrCodeStylingOptions(qr.config, qr.content, {
		qrCodeData: qr.qrCodeData,
		shortUrl: qr.shortUrl || undefined,
	});
	const instance = new QRCodeStylingModule(options);
	return instance.getRawData(fileExtension) as Promise<Blob | null>;
}

export function BulkExportDialog({ open, onOpenChange }: BulkExportDialogProps) {
	const { getToken } = useAuth();
	const t = useTranslations('collection.bulkExport');

	const [page, setPage] = useState(1);
	const [fileExtension, setFileExtension] = useState<TFileExtension>('png');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [exportAll, setExportAll] = useState(true);
	const [exporting, setExporting] = useState(false);
	const [progress, setProgress] = useState(0);

	const { data: qrCodeData, isLoading } = useListQrCodesQuery(page, EXPORT_PAGE_LIMIT);
	const qrCodes = qrCodeData?.data ?? [];
	const total = qrCodeData?.total ?? 0;
	const totalPages = useMemo(() => Math.max(1, Math.ceil(total / EXPORT_PAGE_LIMIT)), [total]);

	const pageAllSelected = qrCodes.length > 0 && qrCodes.every((qr) => selectedIds.has(qr.id));

	const togglePageSelectAll = useCallback(() => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (pageAllSelected) {
				for (const qr of qrCodes) next.delete(qr.id);
			} else {
				for (const qr of qrCodes) next.add(qr.id);
			}
			return next;
		});
		setExportAll(false);
	}, [pageAllSelected, qrCodes]);

	const toggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
		setExportAll(false);
	}, []);

	const handleExportAllToggle = useCallback(() => {
		if (exportAll) {
			setExportAll(false);
			setSelectedIds(new Set());
		} else {
			setExportAll(true);
			setSelectedIds(new Set());
		}
	}, [exportAll]);

	const handleExport = async () => {
		if (!exportAll && selectedIds.size === 0) return;

		setExporting(true);
		setProgress(0);

		try {
			const [JSZip, QRCodeStylingModule] = await Promise.all([
				import('jszip').then((m) => m.default),
				import('qr-code-styling').then((m) => m.default),
			]);

			const zip = new JSZip();
			const usedNames = new Set<string>();
			let successCount = 0;
			let failCount = 0;

			let itemsToExport: TQrCodeWithRelationsResponseDto[];

			if (exportAll) {
				itemsToExport = [];
				const pages = Math.ceil(total / EXPORT_PAGE_LIMIT);

				for (let p = 1; p <= pages; p++) {
					const token = await getToken();
					const result = await fetchQrCodesPage(token, p, EXPORT_PAGE_LIMIT);
					itemsToExport.push(...result.data);
				}
			} else {
				// Selected items may span multiple pages. Fetch all pages and
				// collect items whose IDs are in the selection set.
				itemsToExport = [];
				const remaining = new Set(selectedIds);
				const pages = Math.ceil(total / EXPORT_PAGE_LIMIT);

				for (let p = 1; p <= pages && remaining.size > 0; p++) {
					const token = await getToken();
					const result = await fetchQrCodesPage(token, p, EXPORT_PAGE_LIMIT);
					for (const qr of result.data) {
						if (remaining.delete(qr.id)) {
							itemsToExport.push(qr);
						}
					}
				}
			}

			const totalItems = itemsToExport.length;
			for (let i = 0; i < totalItems; i++) {
				const qr = itemsToExport[i]!;
				try {
					const blob = await generateQrCodeBlob(qr, fileExtension, QRCodeStylingModule);
					if (blob) {
						const baseName = sanitizeFileName(qr.name, qr.id);
						const fileName = getUniqueFileName(usedNames, baseName, fileExtension);
						zip.file(fileName, blob);
						successCount++;
					} else {
						failCount++;
					}
				} catch {
					failCount++;
				}
				setProgress(Math.round(((i + 1) / totalItems) * 100));
			}

			if (successCount === 0) {
				toast({
					title: t('errorTitle'),
					description: t('errorDescription'),
					variant: 'destructive',
				});
				return;
			}

			const zipBlob = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(zipBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `qr-codes-${fileExtension}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			posthog.capture('bulk-export:downloaded', {
				format: fileExtension,
				totalSelected: totalItems,
				successCount,
				failCount,
			});

			toast({
				title: t('success'),
				description: t('progress', { current: successCount, total: totalItems }),
			});

			onOpenChange(false);
		} catch {
			toast({
				title: t('errorTitle'),
				description: t('errorDescription'),
				variant: 'destructive',
			});
		} finally {
			setExporting(false);
		}
	};

	const handleOpenChange = (value: boolean) => {
		if (exporting) return;
		if (!value) {
			setPage(1);
			setSelectedIds(new Set());
			setExportAll(true);
			setProgress(0);
		}
		onOpenChange(value);
	};

	const selectionCount = exportAll ? total : selectedIds.size;
	const pageNumbers = getPageNumbers(page, totalPages);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{t('title')}</DialogTitle>
					<DialogDescription>{t('description')}</DialogDescription>
				</DialogHeader>

				{/* Format selector */}
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium">{t('format')}</span>
					<Select
						value={fileExtension}
						onValueChange={(v) => setFileExtension(v as TFileExtension)}
						disabled={exporting}
					>
						<SelectTrigger className="w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FILE_EXTENSIONS.map((ext) => (
								<SelectItem key={ext.value} value={ext.value}>
									{ext.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader />
					</div>
				) : total === 0 ? (
					<p className="text-muted-foreground text-center py-8">{t('noQrCodes')}</p>
				) : (
					<>
						{/* Export All toggle + Select All on page */}
						<div className="flex items-center justify-between border-b pb-2">
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={exportAll}
										onCheckedChange={handleExportAllToggle}
										disabled={exporting}
									/>
									<span className="text-sm font-medium">
										{t('exportAllLabel', { count: total })}
									</span>
								</label>
								{!exportAll && (
									<button
										type="button"
										onClick={togglePageSelectAll}
										className="text-sm text-primary hover:underline"
										disabled={exporting}
									>
										{pageAllSelected ? t('deselectAll') : t('selectAll')}
									</button>
								)}
							</div>
							<span className="text-sm text-muted-foreground">
								{t('selectedCount', { count: selectionCount, total })}
							</span>
						</div>

						{/* QR Code List */}
						<div className="flex-1 overflow-y-auto max-h-[350px] space-y-1 pr-1">
							{qrCodes.map((qr) => {
								const config = getContentTypeConfig(qr.content.type);
								const Icon = config?.icon;
								const isChecked = exportAll || selectedIds.has(qr.id);
								return (
									<label
										key={qr.id}
										className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
									>
										<Checkbox
											checked={isChecked}
											onCheckedChange={() => toggleSelect(qr.id)}
											disabled={exporting || exportAll}
										/>
										{qr.previewImage ? (
											<img
												src={qr.previewImage}
												alt=""
												className="h-10 w-10 rounded object-cover"
											/>
										) : Icon ? (
											<div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
												<Icon className="h-5 w-5 text-muted-foreground" />
											</div>
										) : (
											<div className="h-10 w-10 rounded bg-muted" />
										)}
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{qr.name || qr.id}</p>
											<p className="text-xs text-muted-foreground uppercase">{qr.content.type}</p>
										</div>
									</label>
								);
							})}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											onClick={page > 1 ? () => setPage(page - 1) : undefined}
											aria-disabled={page === 1}
											className={page === 1 ? 'pointer-events-none opacity-50' : ''}
										/>
									</PaginationItem>
									{pageNumbers.map((p) => (
										<PaginationItem key={p}>
											<PaginationLink isActive={page === p} onClick={() => setPage(p)}>
												{p}
											</PaginationLink>
										</PaginationItem>
									))}
									<PaginationItem>
										<PaginationNext
											onClick={page < totalPages ? () => setPage(page + 1) : undefined}
											aria-disabled={page === totalPages}
											className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						)}

						{/* Progress */}
						{exporting && (
							<div className="space-y-2">
								<Progress value={progress} />
								<p className="text-sm text-muted-foreground text-center">
									{t('downloading')} {progress}%
								</p>
							</div>
						)}

						{/* Download Button */}
						<Button
							onClick={handleExport}
							disabled={selectionCount === 0 || exporting}
							className="w-full"
						>
							{exporting ? t('downloading') : t('downloadBtn')}
						</Button>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
