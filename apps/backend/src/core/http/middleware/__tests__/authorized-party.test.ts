import 'reflect-metadata';
import { type FastifyRequest } from 'fastify';
import type { getAuth as TGetAuth } from '@clerk/fastify';
import type { container as TContainer } from 'tsyringe';
import type { env as TEnv } from '@/core/config/env';
import type { addUserToRequestMiddleware as TAddUserToRequestMiddleware } from '../add-user-to-request.middleware';

jest.mock('@clerk/fastify', () => ({
	...jest.requireActual('@clerk/fastify'),
	getAuth: jest.fn(),
}));
jest.mock('@/core/logging', () => ({ Logger: class Logger {} }));
jest.mock('@/core/cache', () => ({ KeyCache: class KeyCache {} }));
jest.mock('@/core/metrics', () => ({ trackActiveSession: jest.fn(), trackExternal: jest.fn() }));
jest.mock('@/modules/billing/domain/repository/user-subscription.repository', () => ({
	__esModule: true,
	default: class UserSubscriptionRepository {},
}));
jest.mock('@/modules/integration-usage/useCase/record-integration-usage.use-case', () => ({
	RecordIntegrationUsageUseCase: class RecordIntegrationUsageUseCase {},
}));
jest.mock('@/libs/fastify/helpers', () => ({
	createRequestLogObject: (_request: unknown, additionalData: object) => additionalData,
	isHealthCheckRequest: () => false,
}));
jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('session tokens issued to a foreign origin (azp)', () => {
	let addUserToRequestMiddleware: typeof TAddUserToRequestMiddleware;
	let getAuth: jest.MockedFunction<typeof TGetAuth>;
	let container: typeof TContainer;
	let env: typeof TEnv;

	// Logger, KeyCache and usage-tracking stand-in; the cached "not banned" flag and plan keep
	// Clerk and the database out of it
	const services = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		get: jest.fn().mockResolvedValue(0),
		set: jest.fn(),
		getClient: jest.fn(),
		execute: jest.fn(),
	};

	beforeAll(async () => {
		// The global test setup already loaded the middleware with the real Clerk module
		await jest.isolateModulesAsync(async () => {
			({ addUserToRequestMiddleware } = await import('../add-user-to-request.middleware'));
			getAuth = jest.mocked((await import('@clerk/fastify')).getAuth);
			({ container } = await import('tsyringe'));
			({ env } = await import('@/core/config/env'));
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(container.resolve).mockReturnValue(services);
		env.AUTHORIZED_PARTY_CHECK_MODE = 'enforce';
	});

	const run = async (auth: object) => {
		getAuth.mockReturnValue(auth as ReturnType<typeof TGetAuth>);
		const request = { clientIp: '203.0.113.7', headers: {} } as FastifyRequest;
		await addUserToRequestMiddleware(request, undefined);
		return request.user;
	};

	const session = (azp?: string) => ({
		userId: 'user_1',
		tokenType: 'session_token',
		sessionClaims: azp === undefined ? {} : { azp },
	});

	const unauthorizedPartyWarnings = () =>
		services.warn.mock.calls.filter(([message]) => message === 'auth.session.unauthorized-party');

	it.each([
		['the web app', 'https://www.qrcodly.de'],
		['the Chrome extension', 'chrome-extension://pagnaengchnbgecnappokojmdnagefpd'],
	])('accepts a session token issued to %s', async (_label, azp) => {
		expect(await run(session(azp))).toMatchObject({ id: 'user_1', tokenType: 'session_token' });
		expect(unauthorizedPartyWarnings()).toHaveLength(0);
	});

	it('accepts a session token issued to FRONTEND_URL', async () => {
		expect(await run(session(new URL(env.FRONTEND_URL).origin))).toMatchObject({ id: 'user_1' });
	});

	it('accepts a session token without azp, as minted server-side', async () => {
		expect(await run(session())).toMatchObject({ id: 'user_1' });
		expect(unauthorizedPartyWarnings()).toHaveLength(0);
	});

	it('leaves API keys alone, whichever origin calls with them', async () => {
		const user = await run({ userId: 'user_1', tokenType: 'api_key', scopes: ['qr-code:read'] });

		expect(user).toMatchObject({ id: 'user_1', tokenType: 'api_key', scopes: ['qr-code:read'] });
		expect(unauthorizedPartyWarnings()).toHaveLength(0);
	});

	it('treats a token issued to a foreign origin as signed out in enforce mode', async () => {
		expect(await run(session('https://evil.qrcodly.de'))).toBeUndefined();
		expect(unauthorizedPartyWarnings()).toEqual([
			[
				'auth.session.unauthorized-party',
				{ request: { azp: 'https://evil.qrcodly.de', userId: 'user_1', mode: 'enforce' } },
			],
		]);
	});

	it('only logs a token issued to a foreign origin in shadow mode', async () => {
		env.AUTHORIZED_PARTY_CHECK_MODE = 'shadow';

		expect(await run(session('https://evil.qrcodly.de'))).toMatchObject({ id: 'user_1' });
		expect(unauthorizedPartyWarnings()).toHaveLength(1);
	});

	it('ignores signed-out requests', async () => {
		expect(await run({ userId: null, tokenType: 'session_token' })).toBeUndefined();
		expect(unauthorizedPartyWarnings()).toHaveLength(0);
	});
});
