/**
 * Website Preview Component
 * Allows users to enter a website URL and capture it as a background for QR code placement
 * Uses iframe-first approach with screenshot API fallback
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@clerk/nextjs';
import { fetchScreenshot, isIframeAccessible } from '@/lib/screenshot.utils';

interface WebsitePreviewProps {
	onSelect: (imageDataUrl: string) => void;
	className?: string;
}

type LoadingMethod = 'iframe' | 'screenshot' | null;

// Zod schema for URL validation
const websiteUrlSchema = z.object({
	url: z.httpUrl(),
});

type WebsiteUrlFormData = z.infer<typeof websiteUrlSchema>;

export function WebsitePreview({ onSelect, className = '' }: WebsitePreviewProps) {
	const t = useTranslations('generator.preview.website');
	const { getToken } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [loadingMethod, setLoadingMethod] = useState<LoadingMethod>(null);
	const [error, setError] = useState<string | null>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// React Hook Form with Zod validation
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<WebsiteUrlFormData>({
		resolver: zodResolver(websiteUrlSchema),
		mode: 'onChange',
	});

	// Fallback to screenshot API
	const captureWithScreenshotApi = useCallback(
		async (websiteUrl: string) => {
			try {
				setLoadingMethod('screenshot');

				// Get authentication token
				const token = await getToken();

				console.log('Fetching screenshot from backend API');
				const dataUrl = await fetchScreenshot(websiteUrl, token);

				console.log('Screenshot captured successfully, data URL length:', dataUrl.length);
				onSelect(dataUrl);
				setIsLoading(false);
				setLoadingMethod(null);
			} catch (err) {
				console.error('Screenshot API failed:', err);
				setError(
					t('errors.screenshotFailed', {
						default:
							'Failed to capture screenshot. The screenshot service may be unavailable or the URL is invalid.',
					}),
				);
				setIsLoading(false);
				setLoadingMethod(null);
			}
		},
		[onSelect, t, getToken],
	);

	// Try to capture via iframe
	const tryIframeCapture = useCallback((websiteUrl: string) => {
		return new Promise<boolean>((resolve) => {
			const iframe = document.createElement('iframe');
			iframe.style.position = 'fixed';
			iframe.style.top = '-9999px';
			iframe.style.left = '-9999px';
			iframe.style.width = '1024px';
			iframe.style.height = '768px';
			iframe.style.border = 'none';
			iframe.src = websiteUrl;

			let resolved = false;

			// Set timeout for iframe load (3 seconds)
			const timeout = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					document.body.removeChild(iframe);
					resolve(false); // Timeout - fall back to screenshot
				}
			}, 3000);

			iframe.onload = () => {
				if (resolved) return;

				// Check if iframe is accessible
				const accessible = isIframeAccessible(iframe);

				clearTimeout(timeout);
				document.body.removeChild(iframe);
				resolved = true;

				if (accessible) {
					// Iframe loaded successfully, but we still can't easily capture it
					// due to browser security restrictions with cross-origin content
					// Fall back to screenshot API for consistent results
					resolve(false);
				} else {
					resolve(false);
				}
			};

			iframe.onerror = () => {
				if (resolved) return;

				clearTimeout(timeout);
				document.body.removeChild(iframe);
				resolved = true;
				resolve(false);
			};

			document.body.appendChild(iframe);
		});
	}, []);

	// Main preview handler - called on form submit
	const onSubmit = useCallback(
		async (data: WebsiteUrlFormData) => {
			setIsLoading(true);
			setError(null);
			setLoadingMethod('iframe');

			try {
				// Try iframe approach first
				const iframeSuccess = await tryIframeCapture(data.url);

				if (iframeSuccess) {
					// Iframe worked (this path is unlikely due to security restrictions)
					// In practice, we'll almost always fall back to screenshot API
					setIsLoading(false);
					setLoadingMethod(null);
				} else {
					// Fall back to screenshot API
					await captureWithScreenshotApi(data.url);
				}
			} catch (err) {
				console.error('Preview failed:', err);
				setError(
					t('errors.loadFailed', {
						default: 'Failed to load website. Please try again.',
					}),
				);
				setIsLoading(false);
				setLoadingMethod(null);
			}
		},
		[t, tryIframeCapture, captureWithScreenshotApi],
	);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.2 }}
			className={`space-y-4 ${className}`}
		>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{/* URL Input */}
				<div className="space-y-2">
					<Label htmlFor="website-url" className="text-sm font-medium">
						{t('inputLabel', { default: 'Website URL' })}
					</Label>
					<Input
						id="website-url"
						type="url"
						{...register('url')}
						placeholder={t('inputPlaceholder', {
							default: 'Enter URL (e.g., https://example.com)',
						})}
						aria-invalid={!!errors.url}
						aria-describedby={errors.url ? 'url-error' : undefined}
						disabled={isLoading}
						className="w-full"
					/>
					{errors.url && (
						<p id="url-error" className="text-sm text-red-500">
							{errors.url.message}
						</p>
					)}
				</div>

				{/* Preview Button */}
				<Button type="submit" disabled={isLoading} className="w-full" size="lg">
					{isLoading ? (
						<span className="flex items-center gap-2">
							<svg
								className="h-4 w-4 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							{loadingMethod === 'iframe'
								? t('loadingIframe', { default: 'Loading website...' })
								: t('loadingScreenshot', { default: 'Capturing screenshot...' })}
						</span>
					) : (
						<span className="flex items-center gap-2">
							<GlobeAltIcon className="h-5 w-5" />
							{t('previewButton', { default: 'Preview Website' })}
						</span>
					)}
				</Button>
			</form>

			{/* Error Message */}
			{error && (
				<Alert variant="destructive">
					<AlertDescription className="flex items-start justify-between gap-2">
						<span>{error}</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								setError(null);
								handleSubmit(onSubmit)();
							}}
							className="shrink-0"
						>
							{t('retry', { default: 'Retry' })}
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Hidden iframe for capture attempts */}
			<iframe
				ref={iframeRef}
				title="Website preview capture frame"
				className="hidden"
				aria-hidden="true"
			/>

			{/* Info Text */}
			<p className="text-center text-xs text-gray-500 dark:text-gray-400">
				{t('info', {
					default: 'Enter any website URL to use as a background for your QR code',
				})}
			</p>
		</motion.div>
	);
}
