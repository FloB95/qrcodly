/**
 * Camera capture component for QR preview
 * Handles live camera stream and frame capture
 */

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CameraIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCamera } from './hooks/useCamera';
import { useTranslations } from 'next-intl';

interface CameraCaptureProps {
	onCapture?: (imageDataUrl: string) => void;
	onError?: (error: string) => void;
	className?: string;
}

export function CameraCapture({ onCapture, onError, className = '' }: CameraCaptureProps) {
	const t = useTranslations('generator.preview.camera');
	const { videoRef, isActive, error, permissionState, startCamera, stopCamera, captureFrame } =
		useCamera();

	// Auto-start camera on mount
	useEffect(() => {
		// Small delay to ensure component is mounted
		const timer = setTimeout(() => {
			startCamera();
		}, 100);

		return () => {
			clearTimeout(timer);
			stopCamera();
		};
	}, [startCamera, stopCamera]);

	// Notify parent of errors
	useEffect(() => {
		if (error && onError) {
			onError(error);
		}
	}, [error, onError]);

	const handleCapture = () => {
		const frameDataUrl = captureFrame();
		if (frameDataUrl) {
			if (onCapture) {
				onCapture(frameDataUrl);
			}
		} else {
			// Provide user feedback
			onError?.(t('error.captureFailedMessage', { default: 'Failed to capture frame' }));
		}
	};

	return (
		<div className={`flex flex-col space-y-4 ${className}`}>
			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<ExclamationTriangleIcon className="h-4 w-4" />
					<AlertTitle>{t('error.title', { default: 'Camera Error' })}</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Video Stream */}
			{!error && (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.3 }}
					className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900"
				>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className="h-full w-full object-cover"
						style={{ transform: 'scaleX(-1)' }} // Mirror for selfie mode
					/>

					{!isActive && permissionState === 'prompt' && (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
							<div className="flex flex-col items-center space-y-4 text-white">
								<CameraIcon className="h-16 w-16 opacity-50" />
								<p className="text-sm">{t('loading', { default: 'Initializing camera...' })}</p>
							</div>
						</div>
					)}
				</motion.div>
			)}

			{/* Capture Button */}
			{isActive && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					<Button onClick={handleCapture} className="w-full" size="lg">
						<CameraIcon className="mr-2 h-5 w-5" />
						{t('capture', { default: 'Capture Frame' })}
					</Button>
				</motion.div>
			)}

			{/* Retry Button (if error) */}
			{error && permissionState === 'denied' && (
				<Button onClick={startCamera} variant="outline" className="w-full">
					{t('retry', { default: 'Retry Camera Access' })}
				</Button>
			)}
		</div>
	);
}
