/**
 * Custom hook for QR code position and size management
 * Handles dragging and resizing with boundary constraints
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RefObject } from 'react';
import type { QrPosition, UseQrPositionReturn } from '../types';

const DEFAULT_QR_SIZE = 200;
const MIN_QR_SIZE = 80;
const MAX_QR_SIZE = 400; // Reduced from 600 to prevent over-scaling

export function useQrPosition(
	containerRef: RefObject<HTMLDivElement | null>,
	imageRef?: RefObject<HTMLCanvasElement | HTMLImageElement | HTMLDivElement | null>,
): UseQrPositionReturn {
	const [position, setPosition] = useState<QrPosition>({
		x: 0,
		y: 0,
		width: DEFAULT_QR_SIZE,
		height: DEFAULT_QR_SIZE,
		rotation: 0,
	});

	const [isResizing, setIsResizing] = useState(false);
	const [isRotating, setIsRotating] = useState(false);

	const resizeStartRef = useRef<{ width: number; height: number; x: number; y: number } | null>(
		null,
	);
	const rotateStartRef = useRef<{
		rotation: number;
		centerX: number;
		centerY: number;
		startAngle: number;
	} | null>(null);
	const qrRef = useRef<HTMLDivElement | null>(null);

	/**
	 * Clamp value between min and max
	 */
	const clamp = (value: number, min: number, max: number) => {
		return Math.min(Math.max(value, min), max);
	};

	/**
	 * Get boundary dimensions (image if available, otherwise container)
	 */
	const getBoundaryDimensions = useCallback(() => {
		// Use image dimensions if available
		if (imageRef?.current) {
			if (imageRef.current instanceof HTMLImageElement) {
				return { width: imageRef.current.width, height: imageRef.current.height };
			} else if (imageRef.current instanceof HTMLDivElement) {
				return { width: imageRef.current.clientWidth, height: imageRef.current.clientHeight };
			} else {
				// HTMLCanvasElement
				return { width: imageRef.current.width, height: imageRef.current.height };
			}
		}
		// Fall back to container dimensions
		if (!containerRef.current) {
			return { width: window.innerWidth, height: window.innerHeight };
		}
		const rect = containerRef.current.getBoundingClientRect();
		return { width: rect.width, height: rect.height };
	}, [containerRef, imageRef]);

	/**
	 * Start resizing
	 */
	const startResize = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			e.stopPropagation();

			setIsResizing(true);
			resizeStartRef.current = {
				width: position.width,
				height: position.height,
				x: e.clientX,
				y: e.clientY,
			};
		},
		[position.width, position.height],
	);

	/**
	 * Handle resize move
	 */
	const handleResizeMove = useCallback(
		(e: PointerEvent) => {
			if (!isResizing || !resizeStartRef.current) return;

			const deltaX = e.clientX - resizeStartRef.current.x;
			const deltaY = e.clientY - resizeStartRef.current.y;

			// Use diagonal movement (average of x and y deltas) for uniform scaling
			const delta = (deltaX + deltaY) / 2;

			setPosition((prev) => {
				// Safety check - if ref was cleared, return previous state
				if (!resizeStartRef.current) return prev;

				const boundary = getBoundaryDimensions();
				// Limit to 50% of boundary size or MAX_QR_SIZE, whichever is smaller
				const maxAllowedSize = Math.max(
					MIN_QR_SIZE,
					Math.min(
						MAX_QR_SIZE,
						boundary.width * 0.5,
						boundary.height * 0.5,
						boundary.width - prev.x,
						boundary.height - prev.y,
					),
				);

				const newSize = clamp(resizeStartRef.current.width + delta, MIN_QR_SIZE, maxAllowedSize);

				return {
					...prev,
					width: newSize,
					height: newSize, // Keep aspect ratio 1:1
				};
			});
		},
		[isResizing, getBoundaryDimensions],
	);

	/**
	 * Handle resize end
	 */
	const handleResizeEnd = useCallback(() => {
		setIsResizing(false);
		resizeStartRef.current = null;
	}, []);

	/**
	 * Reset to center position
	 */
	const resetPosition = useCallback(() => {
		const boundary = getBoundaryDimensions();
		setPosition({
			x: (boundary.width - DEFAULT_QR_SIZE) / 2,
			y: (boundary.height - DEFAULT_QR_SIZE) / 2,
			width: DEFAULT_QR_SIZE,
			height: DEFAULT_QR_SIZE,
			rotation: 0,
		});
	}, [getBoundaryDimensions]);

	/**
	 * Start rotating via drag handle
	 */
	const startRotate = useCallback(
		(e: React.PointerEvent, qrElement: HTMLDivElement | null) => {
			e.preventDefault();
			e.stopPropagation();

			if (!qrElement) return;

			setIsRotating(true);

			// Get the center of the QR code element
			const rect = qrElement.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			// Calculate initial angle from center to mouse
			const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

			rotateStartRef.current = {
				rotation: position.rotation,
				centerX,
				centerY,
				startAngle,
			};
		},
		[position.rotation],
	);

	/**
	 * Handle rotation move
	 */
	const handleRotateMove = useCallback(
		(e: PointerEvent) => {
			if (!isRotating || !rotateStartRef.current) return;

			const { centerX, centerY, startAngle, rotation: initialRotation } = rotateStartRef.current;

			// Calculate current angle from center to mouse
			const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

			// Calculate the difference and add to initial rotation
			const angleDiff = currentAngle - startAngle;
			const newRotation = (initialRotation + angleDiff + 360) % 360;

			setPosition((prev) => ({
				...prev,
				rotation: newRotation,
			}));
		},
		[isRotating],
	);

	/**
	 * Handle rotation end
	 */
	const handleRotateEnd = useCallback(() => {
		setIsRotating(false);
		rotateStartRef.current = null;
	}, []);

	/**
	 * Set up pointer event listeners for resizing and rotating
	 */
	useEffect(() => {
		window.addEventListener('pointermove', handleResizeMove);
		window.addEventListener('pointermove', handleRotateMove);
		window.addEventListener('pointerup', handleResizeEnd);
		window.addEventListener('pointerup', handleRotateEnd);

		return () => {
			window.removeEventListener('pointermove', handleResizeMove);
			window.removeEventListener('pointermove', handleRotateMove);
			window.removeEventListener('pointerup', handleResizeEnd);
			window.removeEventListener('pointerup', handleRotateEnd);
		};
	}, [handleResizeMove, handleRotateMove, handleResizeEnd, handleRotateEnd]);

	return {
		position,
		isResizing,
		isRotating,
		startResize,
		startRotate,
		resetPosition,
		setPosition,
		qrRef,
	};
}
