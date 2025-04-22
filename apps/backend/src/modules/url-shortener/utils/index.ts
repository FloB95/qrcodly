import { SHORT_BASE_URL } from '../config/constants';

export function buildShortUrl(code: string): string {
	return `${SHORT_BASE_URL}${code}`;
}
