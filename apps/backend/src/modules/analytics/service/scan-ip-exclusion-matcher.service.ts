import { BlockList, isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { inject, singleton } from 'tsyringe';
import { KeyCache } from '@/core/cache';
import { Logger } from '@/core/logging';
import { PlanName } from '@/core/config/plan.config';
import { resolveUserPlan } from '@/core/http/middleware/add-user-to-request.middleware';
import ScanIpExclusionRepository from '../domain/repository/scan-ip-exclusion.repository';
import {
	SCAN_IP_EXCLUSION_CACHE_KEY_PREFIX,
	SCAN_IP_EXCLUSION_CACHE_TTL_SECONDS,
} from '../config/constants';

/**
 * Decides on the scan path whether a scan comes from one of the owner's excluded IP ranges.
 * The owner's list is cached in Redis, also when empty, so most scans cost one cache read.
 * Fails open: when anything goes wrong the scan is counted.
 */
@singleton()
export class ScanIpExclusionMatcherService {
	constructor(
		@inject(ScanIpExclusionRepository) private readonly repository: ScanIpExclusionRepository,
		@inject(KeyCache) private readonly keyCache: KeyCache,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async isExcluded(ownerId: string, ip: string): Promise<boolean> {
		if (isIP(ip) === 0) return false;
		// A mapped IPv6 address (::ffff:a.b.c.d) is the IPv4 scanner it carries
		const scanner = ipaddr.process(ip);
		const family = scanner.kind();

		try {
			const ipRanges = await this.getIpRanges(ownerId);
			if (ipRanges.length === 0) return false;

			// Only ranges of the scanner's own family: BlockList would also match IPv4 scanners against
			// IPv6 ranges that contain the mapped block ::ffff:0:0/96, such as ::/64
			const sameFamily = ipRanges.filter(
				(ipRange) => (isIP(ipRange.split('/')[0]) === 6 ? 'ipv6' : 'ipv4') === family,
			);
			if (!this.buildBlockList(sameFamily).check(scanner.toString(), family)) {
				return false;
			}

			// Entries stay stored after a downgrade but only apply while the owner is Pro
			return (await resolveUserPlan(ownerId)) === PlanName.PRO;
		} catch (error) {
			// Never log the scanner IP here
			this.logger.error('analytics.scan-ip-exclusion.check.failed', {
				error: error as Error,
				ownerId,
			});
			return false;
		}
	}

	async invalidate(ownerId: string): Promise<void> {
		await this.keyCache.del(this.cacheKey(ownerId));
	}

	private cacheKey(ownerId: string): string {
		return `${SCAN_IP_EXCLUSION_CACHE_KEY_PREFIX}${ownerId}`;
	}

	private async getIpRanges(ownerId: string): Promise<string[]> {
		const cached = await this.keyCache.get(this.cacheKey(ownerId));
		if (typeof cached === 'string') {
			return JSON.parse(cached) as string[];
		}

		const ipRanges = (await this.repository.findAllByUserId(ownerId)).map((e) => e.ipRange);
		await this.keyCache.set(
			this.cacheKey(ownerId),
			JSON.stringify(ipRanges),
			SCAN_IP_EXCLUSION_CACHE_TTL_SECONDS,
		);
		return ipRanges;
	}

	private buildBlockList(ipRanges: string[]): BlockList {
		const blockList = new BlockList();
		for (const ipRange of ipRanges) {
			const [address, prefix] = ipRange.split('/');
			const type = isIP(address) === 6 ? 'ipv6' : 'ipv4';
			if (prefix === undefined) {
				blockList.addAddress(address, type);
			} else {
				blockList.addSubnet(address, Number(prefix), type);
			}
		}
		return blockList;
	}
}
