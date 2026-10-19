import type { FastifyRequest } from 'fastify';
import { env } from '@/core/config/env';
import { resolveClientIp } from '../helpers';
import { isCloudflareIp } from '../cloudflare-ip';

// request.ip is the reverse proxy (Traefik) or, for in-cluster calls, the calling pod
const request = (headers: Record<string, string>, ip = '10.42.0.5') =>
	({ headers, ip }) as unknown as FastifyRequest;

describe('resolveClientIp', () => {
	it('uses the address the proxy was connected from', () => {
		expect(resolveClientIp(request({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
	});

	it('ignores X-Forwarded-For entries the client sent itself', () => {
		expect(resolveClientIp(request({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }))).toBe(
			'203.0.113.7',
		);
	});

	it('ignores cf-connecting-ip when the request did not come through Cloudflare', () => {
		expect(
			resolveClientIp(request({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '203.0.113.7' })),
		).toBe('203.0.113.7');
	});

	it.each(['172.70.1.2', '2a06:98c0:3600::103'])(
		'trusts cf-connecting-ip when the proxy was connected from Cloudflare (%s)',
		(edge) => {
			expect(
				resolveClientIp(
					request({
						'cf-connecting-ip': '198.51.100.9',
						'x-forwarded-for': `198.51.100.9, ${edge}`,
					}),
				),
			).toBe('198.51.100.9');
		},
	);

	it('falls back to the socket address for in-cluster calls without proxy headers', () => {
		expect(resolveClientIp(request({}))).toBe('10.42.0.5');
		expect(resolveClientIp(request({ 'cf-connecting-ip': '1.2.3.4' }))).toBe('10.42.0.5');
	});

	it('prefers x-scanner-ip only with a valid internal API key', () => {
		const scan = { 'x-scanner-ip': '198.51.100.20', 'x-forwarded-for': '203.0.113.7' };
		expect(
			resolveClientIp(request({ ...scan, 'x-internal-api-key': env.INTERNAL_API_SECRET })),
		).toBe('198.51.100.20');
		expect(resolveClientIp(request({ ...scan, 'x-internal-api-key': 'wrong' }))).toBe(
			'203.0.113.7',
		);
	});
});

describe('isCloudflareIp', () => {
	it.each([
		['104.16.0.1', true],
		['::ffff:104.16.0.1', true],
		['2606:4700::1', true],
		['203.0.113.7', false],
		['10.42.0.5', false],
		['not-an-ip', false],
	])('%s -> %s', (ip, expected) => {
		expect(isCloudflareIp(ip)).toBe(expected);
	});
});
