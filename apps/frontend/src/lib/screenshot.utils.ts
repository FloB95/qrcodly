/**
 * Utility functions for website screenshot and capture functionality
 */

/**
 * Validates if a URL is a valid HTTP/HTTPS URL
 * @param url - The URL string to validate
 * @returns Validation result with error message if invalid
 */
export function validateWebsiteUrl(url: string): { valid: boolean; error?: string } {
	if (!url || url.trim() === '') {
		return {
			valid: false,
			error: 'URL is required',
		};
	}

	try {
		const urlObj = new URL(url);

		// Must be HTTP or HTTPS
		if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
			return {
				valid: false,
				error: 'URL must start with http:// or https://',
			};
		}

		return { valid: true };
	} catch {
		return {
			valid: false,
			error: 'Invalid URL format',
		};
	}
}

/**
 * Converts an image URL to a data URL by loading it in an Image element
 * This approach avoids CORS issues that can occur with fetch()
 * @param imageUrl - The URL of the image to load
 * @returns Promise that resolves to a data URL
 */
export async function convertImageUrlToDataUrl(imageUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();

		// Set crossOrigin to anonymous to enable CORS
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			try {
				// Create canvas and draw image
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth || img.width;
				canvas.height = img.naturalHeight || img.height;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}

				ctx.drawImage(img, 0, 0);

				// Convert to data URL
				const dataUrl = canvas.toDataURL('image/png');
				resolve(dataUrl);
			} catch (error) {
				reject(
					new Error(
						`Failed to convert image to data URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
					),
				);
			}
		};

		img.onerror = () => {
			reject(new Error('Failed to load image from URL'));
		};

		// Start loading the image
		img.src = imageUrl;
	});
}

/**
 * Converts a Blob to a data URL
 * @param blob - The Blob to convert
 * @returns Promise that resolves to a data URL
 */
export function convertBlobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				resolve(result);
			} else {
				reject(new Error('Failed to convert blob to data URL'));
			}
		};
		reader.onerror = () => {
			reject(new Error('Failed to read blob'));
		};
		reader.readAsDataURL(blob);
	});
}

/**
 * Captures an iframe's content as a data URL using Canvas API
 * Note: This only works if the iframe content is from the same origin or allows access
 * @param iframe - The iframe element to capture
 * @returns Data URL of the captured content, or null if capture fails
 */
export function captureIframeToDataUrl(iframe: HTMLIFrameElement): string | null {
	try {
		const iframeWindow = iframe.contentWindow;
		const iframeDocument = iframe.contentDocument;

		if (!iframeWindow || !iframeDocument) {
			return null;
		}

		// Create canvas with iframe dimensions
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			return null;
		}

		// Set canvas size to match iframe viewport
		const width = iframeWindow.innerWidth || iframeDocument.documentElement.scrollWidth;
		const height = iframeWindow.innerHeight || iframeDocument.documentElement.scrollHeight;

		canvas.width = width;
		canvas.height = height;

		// Try to draw the iframe document to canvas
		// Note: This approach has limitations due to CORS and security restrictions
		// For cross-origin iframes, this will fail and we'll use the screenshot API fallback
		const docElement = iframeDocument.documentElement;

		// Create a temporary SVG to render the HTML content
		const svgData = `
			<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
				<foreignObject width="100%" height="100%">
					<div xmlns="http://www.w3.org/1999/xhtml">
						${docElement.outerHTML}
					</div>
				</foreignObject>
			</svg>
		`;

		const img = new Image();
		const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		return new Promise((resolve) => {
			img.onload = () => {
				ctx.drawImage(img, 0, 0);
				const dataUrl = canvas.toDataURL('image/png');
				URL.revokeObjectURL(url);
				resolve(dataUrl);
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			img.src = url;
		}) as unknown as string;
	} catch (error) {
		console.error('Failed to capture iframe:', error);
		return null;
	}
}

/**
 * Checks if an iframe has loaded successfully and is accessible
 * @param iframe - The iframe element to check
 * @returns true if iframe is accessible, false otherwise
 */
export function isIframeAccessible(iframe: HTMLIFrameElement): boolean {
	try {
		// Try to access the iframe's document
		// This will throw an error if blocked by CORS or X-Frame-Options
		const doc = iframe.contentDocument || iframe.contentWindow?.document;
		return !!doc;
	} catch {
		return false;
	}
}

/**
 * Fetches a screenshot from the backend API with authentication
 * @param websiteUrl - The URL of the website to screenshot
 * @param authToken - The authentication token
 * @returns Promise that resolves to a data URL
 */
export async function fetchScreenshot(
	websiteUrl: string,
	authToken: string | null,
): Promise<string> {
	const { env } = await import('@/env');
	const params = new URLSearchParams({
		url: websiteUrl,
	});

	const response = await fetch(
		`${env.NEXT_PUBLIC_API_URL}/qr-code/screenshot?${params.toString()}`,
		{
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch screenshot: ${response.status} ${response.statusText}`);
	}

	const blob = await response.blob();
	return convertBlobToDataUrl(blob);
}
