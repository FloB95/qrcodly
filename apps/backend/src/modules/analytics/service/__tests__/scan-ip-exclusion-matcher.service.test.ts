import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type KeyCache } from '@/core/cache';
import { type Logger } from '@/core/logging';
import { resolveUserPlan } from '@/core/http/middleware/add-user-to-request.middleware';
import { ScanIpExclusionMatcherService } from '../scan-ip-exclusion-matcher.service';
import type ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import { type TScanIpExclusion } from '../../domain/entities/scan-ip-exclusion.entity';
import {
	SCAN_IP_EXCLUSION_CACHE_KEY_PREFIX,
	SCAN_IP_EXCLUSION_CACHE_TTL_SECONDS,
} from '../../config/constants';

jest.mock('@/core/http/middleware/add-user-to-request.middleware', () => ({
	resolveUserPlan: jest.fn(),
}));

const mockedPlan = resolveUserPlan as jest.Mock;

const OWNER_ID = 'user_owner';
const CACHE_KEY = `${SCAN_IP_EXCLUSION_CACHE_KEY_PREFIX}${OWNER_ID}`;

const row = (ipRange: string) =>
	({ id: ipRange, ipRange, label: null, createdBy: OWNER_ID }) as TScanIpExclusion;

describe('ScanIpExclusionMatcherService', () => {
	let matcher: ScanIpExclusionMatcherService;
	let repository: MockProxy<ScanIpExclusionRepository>;
	let keyCache: MockProxy<KeyCache>;
	let logger: MockProxy<Logger>;

	const withRanges = (...ipRanges: string[]) =>
		repository.findAllByUserId.mockResolvedValue(ipRanges.map(row));

	beforeEach(() => {
		repository = mock<ScanIpExclusionRepository>();
		keyCache = mock<KeyCache>();
		logger = mock<Logger>();
		keyCache.get.mockResolvedValue(null);
		mockedPlan.mockResolvedValue('pro');
		matcher = new ScanIpExclusionMatcherService(repository, keyCache, logger);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('matches an exact IPv4 address', async () => {
		withRanges('203.0.113.7');
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(true);
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.8')).resolves.toBe(false);
	});

	it('matches an IPv4 CIDR range', async () => {
		withRanges('198.51.100.0/24');
		await expect(matcher.isExcluded(OWNER_ID, '198.51.100.250')).resolves.toBe(true);
		await expect(matcher.isExcluded(OWNER_ID, '198.51.101.1')).resolves.toBe(false);
	});

	it('matches an exact IPv6 address, whatever its notation', async () => {
		withRanges('2001:db8::1');
		await expect(matcher.isExcluded(OWNER_ID, '2001:DB8:0:0::1')).resolves.toBe(true);
		await expect(matcher.isExcluded(OWNER_ID, '2001:db8::2')).resolves.toBe(false);
	});

	it('matches an IPv6 CIDR range', async () => {
		withRanges('2001:db8:1200::/48');
		await expect(matcher.isExcluded(OWNER_ID, '2001:db8:1200:ffff::1')).resolves.toBe(true);
		await expect(matcher.isExcluded(OWNER_ID, '2001:db8:1201::1')).resolves.toBe(false);
	});

	it('matches an IPv4-mapped IPv6 scanner against an IPv4 entry', async () => {
		withRanges('198.51.100.0/24', '203.0.113.7');
		await expect(matcher.isExcluded(OWNER_ID, '::ffff:198.51.100.9')).resolves.toBe(true);
		await expect(matcher.isExcluded(OWNER_ID, '::ffff:203.0.113.7')).resolves.toBe(true);
		await expect(matcher.isExcluded(OWNER_ID, '::ffff:203.0.113.8')).resolves.toBe(false);
	});

	// Creating an entry stores ::ffff:a.b.c.d as IPv4; wider IPv6 ranges around that block stay IPv6
	it.each(['::/64', '::/32', '::ffc0:0:0/90', '::fffe:0:0/95'])(
		'never matches IPv4 scanners against the IPv6 range %s',
		async (ipRange) => {
			withRanges(ipRange);
			await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(false);
			await expect(matcher.isExcluded(OWNER_ID, '::ffff:203.0.113.7')).resolves.toBe(false);
		},
	);

	it('does not mix up an IPv4 entry with an IPv6 scanner', async () => {
		withRanges('203.0.113.0/24');
		await expect(matcher.isExcluded(OWNER_ID, '2001:db8::cb00:7107')).resolves.toBe(false);
	});

	it.each(['', 'unknown', '203.0.113.999'])(
		'counts a scan with the invalid scanner IP %p and looks nothing up',
		async (ip) => {
			withRanges('203.0.113.7');
			await expect(matcher.isExcluded(OWNER_ID, ip)).resolves.toBe(false);
			expect(keyCache.get).not.toHaveBeenCalled();
			expect(repository.findAllByUserId).not.toHaveBeenCalled();
		},
	);

	it('does not apply the list while the owner is not Pro', async () => {
		withRanges('203.0.113.7');
		mockedPlan.mockResolvedValue('free');
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(false);
		expect(mockedPlan).toHaveBeenCalledWith(OWNER_ID);
	});

	it('checks the plan only when the IP matches', async () => {
		withRanges('203.0.113.7');
		await matcher.isExcluded(OWNER_ID, '198.51.100.1');
		expect(mockedPlan).not.toHaveBeenCalled();
	});

	it('caches the list on a miss', async () => {
		withRanges('203.0.113.0/24', '2001:db8::/32');
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(true);
		expect(keyCache.get).toHaveBeenCalledWith(CACHE_KEY);
		expect(repository.findAllByUserId).toHaveBeenCalledWith(OWNER_ID);
		expect(keyCache.set).toHaveBeenCalledWith(
			CACHE_KEY,
			JSON.stringify(['203.0.113.0/24', '2001:db8::/32']),
			SCAN_IP_EXCLUSION_CACHE_TTL_SECONDS,
		);
	});

	it('caches the empty list too and skips the plan lookup', async () => {
		withRanges();
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(false);
		expect(keyCache.set).toHaveBeenCalledWith(CACHE_KEY, '[]', SCAN_IP_EXCLUSION_CACHE_TTL_SECONDS);
		expect(mockedPlan).not.toHaveBeenCalled();
	});

	it('reads the list from the cache without touching the database', async () => {
		keyCache.get.mockResolvedValue(JSON.stringify(['203.0.113.0/24']));
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(true);
		expect(repository.findAllByUserId).not.toHaveBeenCalled();
		expect(keyCache.set).not.toHaveBeenCalled();
	});

	it('fails open on a repository error and never logs the scanner IP', async () => {
		repository.findAllByUserId.mockRejectedValue(new Error('db down'));
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(false);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith('analytics.scan-ip-exclusion.check.failed', {
			error: expect.any(Error),
			ownerId: OWNER_ID,
		});
		expect(JSON.stringify(logger.error.mock.calls)).not.toContain('203.0.113.7');
	});

	it('fails open on an unreadable cache entry', async () => {
		keyCache.get.mockResolvedValue('{not json');
		await expect(matcher.isExcluded(OWNER_ID, '203.0.113.7')).resolves.toBe(false);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(logger.error.mock.calls)).not.toContain('203.0.113.7');
	});

	it('drops the cached list on invalidate', async () => {
		await matcher.invalidate(OWNER_ID);
		expect(keyCache.del).toHaveBeenCalledWith(CACHE_KEY);
	});
});
