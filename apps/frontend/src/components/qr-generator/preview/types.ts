/**
 * Type definitions for QR code preview feature
 */

import type { RefObject } from 'react';
import type { ContrastAnalysisResult } from '@/lib/contrast.utils';

/**
 * Background source type
 */
export type BackgroundSource = 'camera' | 'upload' | 'website' | null;

/**
 * Camera permission states
 */
export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | null;

/**
 * QR code position and size
 */
export interface QrPosition {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number; // degrees (0-360)
}

/**
 * Return type for useCamera hook
 */
export interface UseCameraReturn {
	videoRef: RefObject<HTMLVideoElement | null>;
	isActive: boolean;
	error: string | null;
	permissionState: CameraPermissionState;
	startCamera: () => Promise<void>;
	stopCamera: () => void;
	captureFrame: () => string | null;
}

/**
 * Return type for useQrPosition hook
 */
export interface UseQrPositionReturn {
	position: QrPosition;
	isResizing: boolean;
	isRotating: boolean;
	startResize: (e: React.PointerEvent) => void;
	startRotate: (e: React.PointerEvent, qrElement: HTMLDivElement | null) => void;
	resetPosition: () => void;
	setPosition: (position: QrPosition) => void;
	qrRef: RefObject<HTMLDivElement | null>;
}
