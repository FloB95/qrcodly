import { PlanName } from '@/core/config/plan.config';
import { type TTokenType } from '@/core/domain/schema/UserSchema';
import { Logger } from '@/core/logging';
import { KeyCache } from '@/core/cache';
import { createRequestLogObject } from '@/libs/fastify/helpers';
import { getAuth } from '@clerk/fastify';
import { type FastifyRequest } from 'fastify';
import { container } from 'tsyringe';
import UserSubscriptionRepository from '@/modules/billing/domain/repository/user-subscription.repository';

const USER_PLAN_CACHE_TTL = 300; // 5 minutes

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

export async function addUserToRequestMiddleware(request: FastifyRequest, _reply: unknown) {
	const { userId, tokenType } = getAuth(request, {
		acceptsToken: ['session_token', 'api_key'],
	}) as { userId: string | null; tokenType: TTokenType };

	if (userId) {
		const plan = await resolveUserPlan(userId);
		request.user = { id: userId, tokenType, plan };
	} else {
		request.user = undefined;
	}

	// don't log health check & uptime kuma
	if (request.clientIp !== '127.0.0.1' && request.clientIp !== '152.53.13.36') {
		container.resolve(Logger).info('api.request', {
			request: createRequestLogObject(request, { accessType: tokenType }),
		});
	}
}
