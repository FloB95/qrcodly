/**
 * Custom hook for real-time contrast detection
 * Analyzes QR code visibility against background
 */

'use client';

import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { analyzeQrContrast } from '@/lib/contrast.utils';
import type { UseContrastDetectionProps, UseContrastDetectionReturn } from '../types';

export function useContrastDetection({
	backgroundRef,
	qrRef,
	position,
	qrColor,
	enabled,
}: UseContrastDetectionProps): UseContrastDetectionReturn {
	const [analysis, setAnalysis] = useState<UseContrastDetectionReturn['analysis']>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);

	// Debounce position changes to avoid excessive calculations
	const [debouncedPosition] = useDebouncedValue(position, 500);

	useEffect(() => {
		if (!enabled || !backgroundRef.current || !qrRef.current || !qrColor) {
			setAnalysis(null);
			return;
		}

		setIsAnalyzing(true);

		// Run analysis in animation frame to avoid blocking
		requestAnimationFrame(() => {
			try {
				const result = analyzeQrContrast(backgroundRef.current!, debouncedPosition, qrColor);

				setAnalysis(result);
			} catch (error) {
				console.error('Contrast analysis failed:', error);
				setAnalysis(null);
			} finally {
				setIsAnalyzing(false);
			}
		});
	}, [debouncedPosition, qrColor, enabled, backgroundRef, qrRef]);

	return {
		analysis,
		isAnalyzing,
	};
}
