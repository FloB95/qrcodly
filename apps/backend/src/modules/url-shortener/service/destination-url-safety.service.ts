import { inject, singleton } from 'tsyringe';
import { env } from '@/core/config/env';
import { AccountBannedError } from '@/core/error/http';
import { WebRiskService, redactToHost } from '@/core/url-safety';
import { UrlSafetyEscalationService } from './url-safety-escalation.service';
import { urlSafetyChecks } from '@/core/metrics';
import UrlSafetyIncidentRepository from '../domain/repository/url-safety-incident.repository';
import { MaliciousDestinationUrlError } from '../error/http/malicious-destination-url.error';

export type DestinationUrlSafetyContext = 'create' | 'update' | 'duplicate';

/**
 * Screens redirect destinations on the synchronous write path.
 *
 * Fail-open by design: a Google outage produces an `unknown` verdict, which is recorded as such in
 * the metrics but does not refuse the write. Blocking QR-code creation whenever Web Risk hiccups
 * would be a worse outcome than briefly missing a listing — the recurring re-check job is what
 * catches those, and it treats `unknown` very differently.
 */
@singleton()
export class DestinationUrlSafetyService {
	private readonly internalHostnames: Set<string>;

	constructor(
		@inject(WebRiskService) private readonly webRiskService: WebRiskService,
		@inject(UrlSafetyEscalationService)
		private readonly escalationService: UrlSafetyEscalationService,
		@inject(UrlSafetyIncidentRepository)
		private readonly incidentRepository: UrlSafetyIncidentRepository,
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
		shortUrlId: string | null = null,
	): Promise<void> {
		if (!url || this.isInternalUrl(url)) return;

		const verdict = await this.webRiskService.lookup(url);
		urlSafetyChecks.add(1, { source: context, verdict: verdict.status });

		if (verdict.status !== 'unsafe') return;

		const host = redactToHost(url);
		const threatTypes = verdict.threatTypes ?? [];

		await this.incidentRepository.record({
			userId,
			shortUrlId,
			destinationHost: host,
			threatTypes,
			source: context,
			action: 'rejected',
		});

		const { banned } = await this.escalationService.recordOffence({
			userId,
			hosts: [host],
			threatTypes,
			source: context,
		});

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
