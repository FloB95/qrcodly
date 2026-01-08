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
