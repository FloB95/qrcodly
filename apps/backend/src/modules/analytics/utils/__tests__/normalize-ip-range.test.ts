import { normalizeIpRange } from '../normalize-ip-range';

describe('normalizeIpRange', () => {
	it.each([
		['203.0.113.7', '203.0.113.7'],
		['::ffff:203.0.113.7', '203.0.113.7'],
		['::FFFF:CB00:7107', '203.0.113.7'],
		['2001:0DB8:0000:0000:0000:0000:0000:0001', '2001:db8::1'],
		['2001:db8:0:0::1', '2001:db8::1'],
	])('stores the address %p as %p', (input, expected) => {
		expect(normalizeIpRange(input)).toBe(expected);
	});

	it.each([
		['198.51.100.77/24', '198.51.100.0/24'],
		['198.51.100.0/24', '198.51.100.0/24'],
		['198.51.255.255/16', '198.51.0.0/16'],
		['2001:db8:1234:5678::1/48', '2001:db8:1234::/48'],
		['2001:DB8::/32', '2001:db8::/32'],
		['::ffff:198.51.100.77/120', '198.51.100.0/24'],
		['::ffff:0:0/96', '0.0.0.0/0'],
	])('stores the range %p as %p', (input, expected) => {
		expect(normalizeIpRange(input)).toBe(expected);
	});

	it.each([
		['198.51.100.77/32', '198.51.100.77'],
		['2001:db8::1/128', '2001:db8::1'],
		['::ffff:203.0.113.7/128', '203.0.113.7'],
	])('stores the full-length range %p as the address %p', (input, expected) => {
		expect(normalizeIpRange(input)).toBe(expected);
	});
});
