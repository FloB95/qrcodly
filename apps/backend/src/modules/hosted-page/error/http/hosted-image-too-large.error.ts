import { BadRequestError } from '@/core/error/http';

export class HostedImageTooLargeError extends BadRequestError {
	public readonly errorCode = 'HOSTED_IMAGE_TOO_LARGE' as const;

	constructor(maxMegapixels: number) {
		super(`The image has too many pixels. Images may have at most ${maxMegapixels} megapixels.`);
	}
}
