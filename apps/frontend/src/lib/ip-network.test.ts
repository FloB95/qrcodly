import { describe, expect, it } from 'vitest';
import { ScanIpRangeSchema } from '@shared/schemas';
import { ipv6Network64 } from './ip-network';

describe('ipv6Network64', () => {
	it.each([
		['2001:db8:1:2:a:b:c:d', '2001:db8:1:2::/64'],
		['2001:db8:1:2::1', '2001:db8:1:2::/64'],
		['2001:DB8:0001:00a2:FFFF:0:0:1', '2001:db8:1:a2::/64'],
		['2001:db8::1', '2001:db8::/64'],
		['2001:db8:0:0:1:2:3:4', '2001:db8::/64'],
		['2001:0:0:1:2:3:4:5', '2001:0:0:1::/64'],
		['0:0:0:1:2:3:4:5', '0:0:0:1::/64'],
		['::1:2:3:4:5', '0:0:0:1::/64'],
		['::', '::/64'],
	])('%s -> %s', (ip, expected) => {
		expect(ipv6Network64(ip)).toBe(expected);
	});

	it('produces a range the exclusion form accepts unchanged', () => {
		for (const ip of ['2001:db8:1:2:a:b:c:d', '2001:db8::1', '2001:0:0:1:2:3:4:5']) {
			const network = ipv6Network64(ip)!;
			expect(ScanIpRangeSchema.parse(network)).toBe(network);
		}
	});

	it.each(['203.0.113.7', '::ffff:203.0.113.7', '2001:db8::/48', 'not-an-ip', ''])(
		'returns null for %j',
		(ip) => {
			expect(ipv6Network64(ip)).toBeNull();
		},
	);
});
