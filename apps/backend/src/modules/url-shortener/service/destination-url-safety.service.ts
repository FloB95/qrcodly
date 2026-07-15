import { inject, singleton } from 'tsyringe';
import { env } from '@/core/config/env';
import { AccountBannedError } from '@/core/error/http';
import { WebRiskService, UrlSafetyViolationTracker } from '@/core/url-safety';
import { MaliciousDestinationUrlError } from '../error/http/malicious-destination-url.error';

export type DestinationUrlSafetyContext = 'create' | 'update';

/** Screens redirect destinations against Web Risk; skips internal/empty URLs, auto-bans repeat offenders. */
@singleton()
export class DestinationUrlSafetyService {
	private readonly internalHostnames: Set<string>;

	constructor(
		@inject(WebRiskService) private readonly webRiskService: WebRiskService,
		@inject(UrlSafetyViolationTracker)
		private readonly violationTracker: UrlSafetyViolationTracker,
	) {
		this.internalHostnames = new Set(
			[env.FRONTEND_URL, env.BASE_URL, env.BACKEND_URL, env.SHORT_URL_BASE_URL]
				.map((url) => this.safeHostname(url))
				.filter((hostname): hostname is string => hostname !== null),
		);
	}

	async assertDestinationUrlSafe(
		url: string | null | undefined,
		userId: string,
		context: DestinationUrlSafetyContext,
	): Promise<void> {
		if (!url || this.isInternalUrl(url)) return;

		const verdict = await this.webRiskService.isSafe(url);
		if (verdict.safe) return;

		const { banned } = await this.violationTracker.recordViolation(
			userId,
			url,
			verdict.threatTypes ?? [],
			context,
		);

		if (banned) throw new AccountBannedError(userId);
		throw new MaliciousDestinationUrlError();
	}

	private isInternalUrl(url: string): boolean {
		const hostname = this.safeHostname(url);
		return hostname !== null && this.internalHostnames.has(hostname);
	}

	private safeHostname(url: string | undefined): string | null {
		if (!url) return null;
		try {
			return new URL(url).hostname;
		} catch {
			return null;
		}
	}
}
