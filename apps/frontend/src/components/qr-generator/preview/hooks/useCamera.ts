/**
 * Custom hook for camera access and management
 * Handles getUserMedia API, permissions, and frame capture
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { UseCameraReturn, CameraPermissionState } from '../types';

export function useCamera(): UseCameraReturn {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [isActive, setIsActive] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [permissionState, setPermissionState] = useState<CameraPermissionState>(null);

	/**
	 * Start camera stream
	 */
	const startCamera = useCallback(async () => {
		try {
			// Stop any existing stream first
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
				streamRef.current = null;
			}

			setError(null);
			setPermissionState('prompt');

			// Request camera access with preferred settings
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment', // Prefer back camera on mobile
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
				audio: false,
			});

			streamRef.current = stream;

			// Attach stream to video element
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}

			setIsActive(true);
			setPermissionState('granted');
		} catch (err) {
			console.error('Camera access error:', err);
			setIsActive(false);

			// Handle specific error types
			if (err instanceof Error) {
				if (err.name === 'NotAllowedError') {
					setError('Camera access denied. Please grant permission.');
					setPermissionState('denied');
				} else if (err.name === 'NotFoundError') {
					setError('No camera found on this device.');
					setPermissionState('denied');
				} else if (err.name === 'NotReadableError') {
					setError('Camera is in use by another application.');
					setPermissionState('denied');
				} else {
					setError('Failed to access camera. Please try again.');
					setPermissionState('denied');
				}
			}
		}
	}, []);

	/**
	 * Stop camera stream and release resources
	 */
	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}

		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}

		setIsActive(false);
	}, []);

	/**
	 * Capture current video frame as base64 data URL
	 */
	const captureFrame = useCallback((): string | null => {
		if (!videoRef.current || !isActive) {
			return null;
		}

		try {
			const video = videoRef.current;
			const canvas = document.createElement('canvas');

			// Match video dimensions
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const ctx = canvas.getContext('2d');
			if (!ctx) return null;

			// Draw current video frame to canvas
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Convert to data URL
			return canvas.toDataURL('image/jpeg', 0.9);
		} catch (err) {
			console.error('Failed to capture frame:', err);
			return null;
		}
	}, [isActive]);

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		return () => {
			stopCamera();
		};
	}, [stopCamera]);

	return {
		videoRef,
		isActive,
		error,
		permissionState,
		startCamera,
		stopCamera,
		captureFrame,
	};
}
