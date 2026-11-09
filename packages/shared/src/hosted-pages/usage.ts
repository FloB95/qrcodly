import type { TQrCodeContent } from '../schemas/QrCode';
import {
	getHostedFileRefs,
	isHostedPageType,
	showsLandingPage,
	type THostedPageBody,
} from './registry';

/**
 * What hosted QR codes take from the plan. A code that opens its file directly is no landing
 * page; every stored file counts, whatever its kind or page.
 */
export type THostedUsage = {
	landingPages: number;
	files: number;
};

export function emptyHostedUsage(): THostedUsage {
	return { landingPages: 0, files: 0 };
}

export function getHostedUsage(content: TQrCodeContent | THostedPageBody): THostedUsage {
	if (!isHostedPageType(content.type)) return emptyHostedUsage();
	return {
		landingPages: showsLandingPage(content) ? 1 : 0,
		files: getHostedFileRefs(content).length,
	};
}

export function addHostedUsage(a: THostedUsage, b: THostedUsage): THostedUsage {
	return { landingPages: a.landingPages + b.landingPages, files: a.files + b.files };
}

export function sumHostedUsage(contents: (TQrCodeContent | THostedPageBody)[]): THostedUsage {
	return contents.map(getHostedUsage).reduce(addHostedUsage, emptyHostedUsage());
}
