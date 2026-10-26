'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	CameraIcon,
	ExclamationTriangleIcon,
	PhotoIcon,
	QrCodeIcon,
	ShieldCheckIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { decodeQrImageFile, isImageFile, type DecodeFailureReason } from './decodeQrImage';
import { parseQrContent, type ParsedQrContent } from './parseQrContent';
import { useCameraScanner, type CameraError } from './useCameraScanner';
import { ScanResult } from './ScanResult';

type ScanError = DecodeFailureReason | CameraError;

type ScannerState =
	| { status: 'idle' }
	| { status: 'decoding' }
	| { status: 'error'; error: ScanError }
	| { status: 'result'; raw: string; parsed: ParsedQrContent; previewUrl: string | null };

export function QrScanner() {
	const t = useTranslations('qrScannerTool.scanner');
	const [state, setState] = useState<ScannerState>({ status: 'idle' });
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const selectButtonRef = useRef<HTMLButtonElement | null>(null);
	const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
	const previewUrlRef = useRef<string | null>(null);
	const requestRef = useRef(0);

	const replacePreview = useCallback((url: string | null) => {
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		previewUrlRef.current = url;
	}, []);

	useEffect(() => () => replacePreview(null), [replacePreview]);

	const showResult = useCallback(
		(raw: string, previewUrl: string | null) => {
			replacePreview(previewUrl);
			setState({ status: 'result', raw, parsed: parseQrContent(raw), previewUrl });
		},
		[replacePreview],
	);

	const showError = useCallback(
		(error: ScanError) => {
			replacePreview(null);
			setState({ status: 'error', error });
		},
		[replacePreview],
	);

	const onCameraDetected = useCallback((data: string) => showResult(data, null), [showResult]);
	const {
		videoRef,
		status: cameraStatus,
		start: startCamera,
		stop: stopCamera,
	} = useCameraScanner({ onDetected: onCameraDetected, onError: showError });

	const handleFile = useCallback(
		async (file: File) => {
			stopCamera();
			const requestId = ++requestRef.current;
			if (!isImageFile(file)) {
				showError('invalidFile');
				return;
			}

			replacePreview(null);
			setState({ status: 'decoding' });
			const result = await decodeQrImageFile(file);
			if (requestId !== requestRef.current) return;

			if (!result.ok) {
				showError(result.reason);
				return;
			}
			showResult(result.data, URL.createObjectURL(file));
		},
		[replacePreview, showError, showResult, stopCamera],
	);

	const reset = useCallback(() => {
		requestRef.current++;
		stopCamera();
		replacePreview(null);
		setState({ status: 'idle' });
		selectButtonRef.current?.focus();
	}, [replacePreview, stopCamera]);

	const openCamera = useCallback(() => {
		requestRef.current++;
		replacePreview(null);
		setState({ status: 'idle' });
		void startCamera();
	}, [replacePreview, startCamera]);

	useEffect(() => {
		const onPaste = (event: ClipboardEvent) => {
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest('input, textarea, [contenteditable="true"]')) return;

			const items = Array.from(event.clipboardData?.items ?? []);
			const imageItem = items.find(
				(item) => item.kind === 'file' && item.type.startsWith('image/'),
			);
			const file = imageItem?.getAsFile();
			if (!file) return;

			event.preventDefault();
			void handleFile(file);
		};

		document.addEventListener('paste', onPaste);
		return () => document.removeEventListener('paste', onPaste);
	}, [handleFile]);

	useEffect(() => {
		if (state.status === 'result') resultHeadingRef.current?.focus();
	}, [state]);

	const cameraVisible = cameraStatus !== 'idle';
	const showDropzone = !cameraVisible && state.status !== 'result';

	return (
		<div className="mx-auto w-full max-w-2xl rounded-[28px] bg-white p-3 text-left sm:p-4">
			<div aria-live="polite" aria-atomic="true">
				{showDropzone && (
					<div
						onDragOver={(event) => {
							event.preventDefault();
							setIsDragging(true);
						}}
						onDragLeave={() => setIsDragging(false)}
						onDrop={(event) => {
							event.preventDefault();
							setIsDragging(false);
							const file = event.dataTransfer.files[0];
							if (file) void handleFile(file);
						}}
						className={cn(
							'flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-[20px] border border-dashed px-6 py-10 text-center transition-colors',
							isDragging ? 'border-slate-900 bg-slate-50' : 'border-slate-300',
						)}
					>
						{state.status === 'decoding' ? (
							<p
								role="status"
								className="flex items-center gap-3 text-base font-medium text-slate-900"
							>
								<Loader2 className="h-6 w-6 animate-spin" aria-hidden />
								{t('decoding')}
							</p>
						) : (
							<>
								<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
									<QrCodeIcon className="h-7 w-7" aria-hidden />
								</div>
								<div>
									<p className="text-lg font-bold text-slate-900">{t('dropzoneTitle')}</p>
									<p className="mt-1 text-sm text-slate-500">{t('dropzoneHint')}</p>
								</div>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*,.svg"
									className="hidden"
									onChange={(event) => {
										const file = event.target.files?.[0];
										event.target.value = '';
										if (file) void handleFile(file);
									}}
								/>
								<div className="flex flex-wrap items-center justify-center gap-3">
									<Button
										ref={selectButtonRef}
										type="button"
										className="gap-2"
										onClick={() => fileInputRef.current?.click()}
									>
										<PhotoIcon className="h-4 w-4" aria-hidden />
										{t('selectImage')}
									</Button>
									<Button type="button" variant="outline" className="gap-2" onClick={openCamera}>
										<CameraIcon className="h-4 w-4" aria-hidden />
										{t('useCamera')}
									</Button>
								</div>
								<p className="flex items-center gap-2 text-xs text-slate-500">
									<ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-slate-900" aria-hidden />
									{t('privacyNote')}
								</p>
							</>
						)}
					</div>
				)}

				{state.status === 'result' && (
					<ScanResult
						raw={state.raw}
						parsed={state.parsed}
						previewUrl={state.previewUrl}
						onReset={reset}
						headingRef={resultHeadingRef}
					/>
				)}
			</div>

			<div
				className={cn(
					'relative overflow-hidden rounded-[20px] bg-slate-900',
					!cameraVisible && 'hidden',
				)}
			>
				<video
					ref={videoRef}
					autoPlay
					muted
					playsInline
					aria-label={t('cameraVideoLabel')}
					className="block max-h-[420px] min-h-[320px] w-full object-cover"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 flex items-center justify-center"
				>
					<div className="h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
				</div>
				{cameraStatus === 'starting' && (
					<div
						role="status"
						className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/80 text-sm text-white"
					>
						<Loader2 className="h-5 w-5 animate-spin" aria-hidden />
						{t('cameraStarting')}
					</div>
				)}
				<div className="absolute right-3 top-3">
					<Button type="button" variant="white" size="sm" className="gap-2" onClick={stopCamera}>
						<XMarkIcon className="h-4 w-4" aria-hidden />
						{t('stopCamera')}
					</Button>
				</div>
			</div>
			{cameraVisible && (
				<p className="px-3 pb-2 pt-4 text-center text-sm text-slate-500">{t('cameraHint')}</p>
			)}

			{state.status === 'error' && (
				<p
					role="alert"
					className="flex items-start gap-2 px-3 pb-2 pt-4 text-sm leading-relaxed text-slate-700"
				>
					<ExclamationTriangleIcon
						className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
						aria-hidden
					/>
					{t(`errors.${state.error}`)}
				</p>
			)}
		</div>
	);
}
