import { inject, injectable } from 'tsyringe';
import { BadRequestError } from '@/core/error/http';
import { Logger } from '../logging';

@injectable()
export class ScreenshotService {
	constructor(@inject(Logger) private readonly logger: Logger) {}

	/**
	 * Captures a screenshot of a website using Thum.io
	 * @param url - The website URL to screenshot
	 * @returns Image buffer
	 */
	async captureWebsite(url: string): Promise<Buffer> {
		this.logger.info('screenshot.take', { url });

		try {
			// Using Thum.io (1000/month free, no API key required)
			// Note: Thum.io expects the URL NOT to be encoded - just append it directly
			// Removed crop parameter to capture full page height
			const screenshotUrl = `https://image.thum.io/get/width/1200/noanimate/${url}`;

			// Fetch the screenshot
			const response = await fetch(screenshotUrl, {
				headers: {
					'User-Agent': 'QRcodly/1.0',
				},
			});

			if (!response.ok) {
				this.logger.error('screenshot.apiError', {
					url,
					screenshotUrl,
					status: response.status,
					statusText: response.statusText,
				});
				throw new Error(`Screenshot service returned ${response.status}`);
			}

			// Get the image as a buffer
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			return buffer;
		} catch (e: any) {
			const error = e as Error;
			this.logger.error('screenshot.error', {
				url,
				error: error.message,
			});
			throw new BadRequestError(`Failed to capture screenshot: ${error.message}`);
		}
	}
}
