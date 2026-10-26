import { PlanName } from '@/core/config/plan.config';
import { FIRST_PARTY_ORIGINS } from '@/core/config/constants';
import { env } from '@/core/config/env';
import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { Logger } from '@/core/logging';
import { KeyCache } from '@/core/cache';
import { AccountBannedError } from '@/core/error/http';
import { createRequestLogObject, isHealthCheckRequest } from '@/libs/fastify/helpers';
import { clerkClient, getAuth } from '@clerk/fastify';
import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import UserSubscriptionRepository from '@/modules/billing/domain/repository/user-subscription.repository';
import { trackActiveSession, trackExternal } from '@/core/metrics';
import { detectApiClient } from '@/modules/integration-usage/utils/detect-api-client';
import { RecordIntegrationUsageUseCase } from '@/modules/integration-usage/useCase/record-integration-usage.use-case';

const USER_PLAN_CACHE_TTL = 300; // 5 minutes
const USER_BAN_CACHE_TTL = 60; // 1 minute — bans are set manually in Clerk, so propagate quickly

/**
 * Custom user ban (Clerk's native ban is Pro-only). Ban state lives in the
 * user's Clerk `privateMetadata.banned` flag, set manually in the Clerk
 * dashboard. Cached briefly to avoid a Clerk API call on every request.
 * Fails open on error so a Clerk outage never locks out the whole app.
 */
async function resolveUserBanStatus(userId: string): Promise<boolean> {
	try {
		const cache = container.resolve(KeyCache);
		const cacheKey = `user_ban:${userId}`;

		const cached = await cache.get(cacheKey);
		if (cached !== null) {
			return cached === 1 || cached === '1';
		}

		const user = await trackExternal('clerk', 'users.getUser', () =>
			clerkClient.users.getUser(userId),
		);
		const banned = user.privateMetadata?.banned === true;

		await cache.set(cacheKey, banned ? 1 : 0, USER_BAN_CACHE_TTL);
		return banned;
	} catch (error) {
		container.resolve(Logger).error('resolveUserBanStatus.failed', {
			error: error as Error,
			userId,
		});
		return false;
	}
}

async function resolveUserPlan(userId: string): Promise<PlanName> {
	try {
		const cache = container.resolve(KeyCache);
		const cacheKey = `user_plan:${userId}`;

		const cached = await cache.get(cacheKey);
		if (cached !== null) {
			return cached === PlanName.PRO ? PlanName.PRO : PlanName.FREE;
		}

		const repo = container.resolve(UserSubscriptionRepository);
		const subscription = await repo.findByUserId(userId);
		const plan =
			subscription && (subscription.status === 'active' || subscription.status === 'trialing')
				? PlanName.PRO
				: PlanName.FREE;

		await cache.set(cacheKey, plan, USER_PLAN_CACHE_TTL);
		return plan;
	} catch (error) {
		container.resolve(Logger).error('resolveUserPlan.failed', { error: error as Error, userId });
		return PlanName.FREE;
	}
}

type TRequestAuth = {
	userId: string | null;
	tokenType: TTokenType;
	scopes?: string[];
	/** API key id, only set for api_key tokens */
	id?: string;
	sessionClaims?: { azp?: string };
};

/**
 * Clerk stamps a session token with the origin it was issued to (`azp`). One issued to a foreign
 * origin, such as a taken-over qrcodly.de subdomain, must not act on the API. Tokens without `azp`
 * (minted server-side, e.g. in tests) and API keys are out of scope.
 */
function isRejectedAuthorizedParty(request: FastifyRequest, auth: TRequestAuth): boolean {
	const azp = auth.sessionClaims?.azp;
	if (auth.tokenType !== 'session_token' || !azp || FIRST_PARTY_ORIGINS.includes(azp)) {
		return false;
	}

	container.resolve(Logger).warn('auth.session.unauthorized-party', {
		request: createRequestLogObject(request, {
			azp,
			userId: auth.userId,
			mode: env.AUTHORIZED_PARTY_CHECK_MODE,
		}),
	});
	return env.AUTHORIZED_PARTY_CHECK_MODE === 'enforce';
}

export async function addUserToRequestMiddleware(request: FastifyRequest, _reply: unknown) {
	const auth = getAuth(request, {
		acceptsToken: ['session_token', 'api_key'],
	}) as TRequestAuth;

	const { tokenType } = auth;
	const userId = auth.userId && !isRejectedAuthorizedParty(request, auth) ? auth.userId : null;
	const apiClient = detectApiClient({
		headers: request.headers,
		tokenType: userId ? tokenType : null,
		authorizedParty: auth.sessionClaims?.azp,
	});

	if (userId) {
		if (await resolveUserBanStatus(userId)) {
			throw new AccountBannedError(userId);
		}

		const plan = await resolveUserPlan(userId);
		const scopes = tokenType === 'api_key' ? (auth.scopes ?? []) : undefined;
		request.user = { id: userId, tokenType, plan, scopes };
		void trackActiveSession(container.resolve(KeyCache).getClient(), userId);
		if (apiClient) {
			void container.resolve(RecordIntegrationUsageUseCase).execute(userId, apiClient);
		}
	} else {
		request.user = undefined;
	}

	// don't log health checks & uptime kuma
	if (
		!isHealthCheckRequest(request) &&
		request.clientIp !== '127.0.0.1' &&
		request.clientIp !== '152.53.13.36'
	) {
		container.resolve(Logger).info('api.request', {
			request: createRequestLogObject(request, {
				accessType: tokenType,
				client: apiClient?.client,
				clientVersion: apiClient?.version ?? undefined,
				apiKeyId: tokenType === 'api_key' ? auth.id : undefined,
			}),
		});
	}
}
