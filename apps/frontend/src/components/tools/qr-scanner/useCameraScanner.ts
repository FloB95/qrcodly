'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDecoder } from './decodeQrImage';

export type CameraStatus = 'idle' | 'starting' | 'active';
export type CameraError = 'cameraDenied' | 'cameraUnavailable';

const SCAN_INTERVAL_MS = 150;
const FRAME_MAX_SIDE = 800;

export function useCameraScanner({
	onDetected,
	onError,
}: {
	onDetected: (data: string) => void;
	onError: (error: CameraError) => void;
}) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const timerRef = useRef<number | null>(null);
	const callbacksRef = useRef({ onDetected, onError });
	const [status, setStatus] = useState<CameraStatus>('idle');

	useEffect(() => {
		callbacksRef.current = { onDetected, onError };
	}, [onDetected, onError]);

	const stop = useCallback(() => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
		setStatus('idle');
	}, []);

	const start = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			callbacksRef.current.onError('cameraUnavailable');
			return;
		}

		setStatus('starting');
		try {
			const [decoder, stream] = await Promise.all([
				loadDecoder(),
				navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						facingMode: { ideal: 'environment' },
						width: { ideal: 1280 },
						height: { ideal: 720 },
					},
				}),
			]);

			const video = videoRef.current;
			if (!video) {
				stream.getTracks().forEach((track) => track.stop());
				setStatus('idle');
				return;
			}

			streamRef.current = stream;
			video.srcObject = stream;
			await video.play();
			setStatus('active');

			const scanFrame = () => {
				const currentVideo = videoRef.current;
				if (!currentVideo || !streamRef.current) return;

				if (
					currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
					currentVideo.videoWidth > 0
				) {
					const canvas = (canvasRef.current ??= document.createElement('canvas'));
					const scale = Math.min(
						1,
						FRAME_MAX_SIDE / Math.max(currentVideo.videoWidth, currentVideo.videoHeight),
					);
					const width = Math.round(currentVideo.videoWidth * scale);
					const height = Math.round(currentVideo.videoHeight * scale);
					if (canvas.width !== width || canvas.height !== height) {
						canvas.width = width;
						canvas.height = height;
					}

					const context = canvas.getContext('2d', { willReadFrequently: true });
					if (context) {
						context.drawImage(currentVideo, 0, 0, width, height);
						const imageData = context.getImageData(0, 0, width, height);
						const code = decoder(imageData.data, width, height, {
							inversionAttempts: 'dontInvert',
						});
						if (code?.data) {
							stop();
							callbacksRef.current.onDetected(code.data);
							return;
						}
					}
				}

				timerRef.current = window.setTimeout(scanFrame, SCAN_INTERVAL_MS);
			};
			scanFrame();
		} catch (error) {
			stop();
			callbacksRef.current.onError(isPermissionError(error) ? 'cameraDenied' : 'cameraUnavailable');
		}
	}, [stop]);

	useEffect(() => stop, [stop]);

	return { videoRef, status, start, stop };
}

function isPermissionError(error: unknown): boolean {
	return (
		error instanceof DOMException &&
		(error.name === 'NotAllowedError' || error.name === 'SecurityError')
	);
}
