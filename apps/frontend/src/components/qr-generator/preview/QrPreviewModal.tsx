/**
 * QR Preview Modal
 * Main container for QR code background preview feature
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ArrowPathIcon,
	ArrowsPointingOutIcon,
	XMarkIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { DynamicQrCode } from '../DynamicQrCode';
import { BackgroundSelector } from './BackgroundSelector';
import { useQrPosition } from './hooks/useQrPosition';
import { useTranslations } from 'next-intl';
import type { BackgroundSource } from './types';

interface QrPreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function QrPreviewModal({ open, onOpenChange }: QrPreviewModalProps) {
	const t = useTranslations('generator.preview');
	const { config, content, shortUrl } = useQrCodeGeneratorStore((state) => state);

	const [step, setStep] = useState<'select' | 'preview'>('select');
	const [backgroundSource, setBackgroundSource] = useState<BackgroundSource>('predefined');
	const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
	const [showInstructions, setShowInstructions] = useState(() => {
		// Check localStorage to see if user has dismissed instructions
		if (typeof window !== 'undefined') {
			return localStorage.getItem('qr-preview-instructions-dismissed') !== 'true';
		}
		return true;
	});
	const [isOverResizeHandle, setIsOverResizeHandle] = useState(false);
	const [isOverRotateHandle, setIsOverRotateHandle] = useState(false);
	const [zoom, setZoom] = useState(1); // 1 = 100%, 1.5 = 150%, etc.

	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);

	const {
		position,
		isResizing,
		isRotating,
		startResize,
		startRotate,
		resetPosition,
		setPosition,
		qrRef,
	} = useQrPosition(containerRef, imageRef);

	// Handle manual dismissal of instructions
	const handleDismissInstructions = () => {
		setShowInstructions(false);
		if (typeof window !== 'undefined') {
			localStorage.setItem('qr-preview-instructions-dismissed', 'true');
		}
	};

	// Auto-close modal on small viewports (< 640px)
	useEffect(() => {
		if (!open) return;

		const handleResize = () => {
			if (window.innerWidth < 640) {
				// sm breakpoint
				onOpenChange(false);
			}
		};

		// Check on mount
		handleResize();

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [open, onOpenChange]);

	// Handle window resize - adjust QR position proportionally
	useEffect(() => {
		if (!containerRef.current || !backgroundImage) return;

		const container = containerRef.current;
		let previousWidth = container.clientWidth;
		let previousHeight = container.clientHeight;

		const handleResize = () => {
			if (!container) return;

			const newWidth = container.clientWidth;
			const newHeight = container.clientHeight;

			// Only adjust if dimensions actually changed
			if (previousWidth === newWidth && previousHeight === newHeight) return;

			// Prevent division by zero
			if (previousWidth === 0 || previousHeight === 0) {
				previousWidth = newWidth;
				previousHeight = newHeight;
				return;
			}

			// Calculate the ratio of change
			const widthRatio = newWidth / previousWidth;
			const heightRatio = newHeight / previousHeight;

			// Ensure ratios are valid finite numbers
			if (!Number.isFinite(widthRatio) || !Number.isFinite(heightRatio)) return;

			// Adjust QR position proportionally
			setPosition({
				x: position.x * widthRatio,
				y: position.y * heightRatio,
				width: position.width,
				height: position.height,
				rotation: position.rotation,
			});

			previousWidth = newWidth;
			previousHeight = newHeight;
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [backgroundImage, position, setPosition]);

	const handleImageSelected = (imageDataUrl: string) => {
		setBackgroundImage(imageDataUrl);
		setStep('preview');
	};

	const handleChangeBackground = () => {
		setStep('select');
	};

	const handleReset = () => {
		resetPosition();
	};

	const handleClose = () => {
		onOpenChange(false);
		// Reset to select step after modal closes
		setTimeout(() => {
			setStep('select');
			setBackgroundImage(null);
			setZoom(1); // Reset zoom
		}, 200);
	};

	const handleZoomIn = () => {
		setZoom((prev) => Math.min(prev + 0.25, 3)); // Max zoom 3x
	};

	const handleZoomOut = () => {
		setZoom((prev) => Math.max(prev - 0.25, 0.5)); // Min zoom 0.5x
	};

	const handleZoomReset = () => {
		setZoom(1);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent
				className={
					step === 'select'
						? 'sm:max-w-2xl p-6 sm:max-h-[95vh] overflow-auto'
						: 'sm:max-h-[95vh] sm:max-w-[95vw] overflow-hidden p-6'
				}
			>
				<DialogHeader>
					<DialogTitle>
						{step === 'select'
							? t('selectTitle', { default: 'Select Background' })
							: t('title', { default: 'QR Code Background Preview' })}
					</DialogTitle>
				</DialogHeader>

				{/* Step 1: Select Background */}
				{step === 'select' && (
					<div className="mt-4">
						<BackgroundSelector
							source={backgroundSource}
							onSourceChange={setBackgroundSource}
							onImageSelected={handleImageSelected}
						/>
					</div>
				)}

				{/* Step 2: Preview with QR Code */}
				{step === 'preview' && backgroundImage && (
					<div className="flex flex-col gap-4">
						{/* Preview Area - Full Width */}
						<div className="flex-1">
							{backgroundImage ? (
								<div
									className="relative flex w-full justify-center overflow-y-auto overflow-x-hidden rounded-lg bg-gray-100 dark:bg-gray-900"
									style={{ height: 'calc(95vh - 200px)', maxHeight: '800px' }}
								>
									<div className="flex justify-center flex-col h-fit">
										{/* SHRINK-WRAP container */}
										<motion.div ref={containerRef} className="relative inline-block h-fit">
											<img
												ref={imageRef}
												src={backgroundImage}
												alt="QR preview background"
												className="block w-full object-contain select-none max-h-200 max-w-200 transition-transform duration-200"
												draggable={false}
												onLoad={resetPosition}
												style={{
													transform: `scale(${zoom})`,
												}}
											/>

											{/* QR */}
											<motion.div
												ref={qrRef}
												drag={
													!isResizing && !isRotating && !isOverResizeHandle && !isOverRotateHandle
												}
												dragConstraints={containerRef}
												dragElastic={0}
												dragMomentum={false}
												className="absolute top-0 left-0 group"
												// initial={{
												// 	x: 0,
												// 	y: 0,
												// }}
												onDragStart={(event) => {
													if (isResizing || isRotating) {
														event.preventDefault();
													}
												}}
												onDragEnd={(_, info) => {
													setPosition({
														...position,
														x: position.x + info.offset.x,
														y: position.y + info.offset.y,
														rotation: position.rotation,
													});
												}}
												style={{
													width: position.width,
													height: position.height,
													maxHeight: 400,
													maxWidth: 400,
													touchAction: 'none',
													cursor: isResizing ? 'nwse-resize' : isRotating ? 'grabbing' : 'move',
													rotate: position.rotation,
												}}
											>
												<div className="pointer-events-none h-full w-full">
													<DynamicQrCode
														qrCode={{ config, content }}
														shortUrl={shortUrl}
														additionalStyles="max-width: 100%; max-height: 100%;"
													/>
												</div>

												{/* Rotate Handle - Top Right */}
												<motion.div
													onPointerDown={(e) => {
														e.stopPropagation();
														e.preventDefault();
														startRotate(e, qrRef.current);
													}}
													onMouseEnter={() => setIsOverRotateHandle(true)}
													onMouseLeave={() => setIsOverRotateHandle(false)}
													animate={{
														opacity: isResizing || isRotating ? 0 : undefined,
														scale: Math.min(1, position.width / 200),
													}}
													whileHover={{ scale: Math.min(1, position.width / 200) * 1.15 }}
													whileTap={{ scale: Math.min(1, position.width / 200) * 0.9 }}
													transition={{ duration: 0.2 }}
													className="absolute top-0 right-0 flex h-8 w-8 cursor-grab items-center justify-center rounded-bl-lg  bg-blue-500 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
													style={{ touchAction: 'none' }}
												>
													<ArrowPathIcon className="h-4 w-4" />
												</motion.div>

												{/* Resize Handle - Bottom Right */}
												<motion.div
													onPointerDown={(e) => {
														e.stopPropagation();
														e.preventDefault();
														startResize(e);
													}}
													onMouseEnter={() => setIsOverResizeHandle(true)}
													onMouseLeave={() => setIsOverResizeHandle(false)}
													animate={{
														opacity: isResizing || isRotating ? 0 : undefined,
														scale: Math.min(1, position.width / 200),
													}}
													whileHover={{ scale: Math.min(1, position.width / 200) * 1.15 }}
													whileTap={{ scale: Math.min(1, position.width / 200) * 0.9 }}
													transition={{ duration: 0.2 }}
													className="absolute bottom-0 right-0 flex h-8 w-8 cursor-nwse-resize items-center justify-center rounded-tl-lg bg-primary text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
													style={{ touchAction: 'none' }}
												>
													<ArrowsPointingOutIcon className="h-4 w-4" />
												</motion.div>
											</motion.div>
										</motion.div>
									</div>
								</div>
							) : null}
						</div>
					</div>
				)}

				{/* Instructions Overlay - Fixed at bottom */}
				<AnimatePresence>
					{showInstructions && step === 'preview' && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{
								delay: 0.5,
							}}
							className="fixed bottom-22 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 rounded-lg bg-black/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm flex items-center gap-3"
						>
							<span>
								{t('controls.move', {
									default:
										'Drag to reposition · Drag bottom-right to resize · Drag top-right to rotate',
								})}
							</span>
							<button
								onClick={handleDismissInstructions}
								className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/20 transition-colors"
								aria-label="Dismiss instructions"
							>
								<XMarkIcon className="h-4 w-4" />
							</button>
						</motion.div>
					)}
				</AnimatePresence>

				<DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
					{step === 'preview' && (
						<>
							<div className="flex flex-col gap-2 sm:flex-row">
								{/* Background Controls */}
								<div className="flex gap-2">
									<Button onClick={handleChangeBackground} variant="outline" size="sm">
										<ArrowPathIcon className="h-4 w-4" />
									</Button>
								</div>

								{/* Zoom Controls */}
								<div className="flex gap-1 border-l pl-2">
									<Button
										onClick={handleZoomOut}
										variant="outline"
										size="sm"
										disabled={zoom <= 0.5}
										title="Zoom Out"
									>
										<MagnifyingGlassMinusIcon className="h-4 w-4" />
									</Button>
									<Button onClick={handleZoomReset} variant="outline" size="sm" title="Reset Zoom">
										{Math.round(zoom * 100)}%
									</Button>
									<Button
										onClick={handleZoomIn}
										variant="outline"
										size="sm"
										disabled={zoom >= 3}
										title="Zoom In"
									>
										<MagnifyingGlassPlusIcon className="h-4 w-4" />
									</Button>
								</div>

								{/* Reset Position */}
								<div className="flex gap-2 border-l pl-2">
									<Button
										onClick={handleReset}
										variant="outline"
										size="sm"
										title="Reset QR Position"
									>
										{t('controls.reset', { default: 'Reset' })}
									</Button>
								</div>
							</div>

							<Button onClick={handleClose} variant="secondary">
								{t('close', { default: 'Close' })}
							</Button>
						</>
					)}
					{step === 'select' && (
						<Button onClick={handleClose} variant="secondary" className="w-full sm:w-auto">
							{t('close', { default: 'Close' })}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
