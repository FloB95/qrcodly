import { container } from 'tsyringe';
import { eq } from 'drizzle-orm';
import db from '@/core/db';
import { customDomain } from '@/core/db/schemas';
import { daysAgo } from '@/core/utils/date';
import { resetTestState } from '@/tests/shared/test-context';
import CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import {
	getTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	generateCreateCustomDomainDto,
	TEST_USER_PRO_ID,
	type TestContext,
} from './utils';

/**
 * Backs the periodic verification sweep: it must pick up every domain still waiting on DNS or SSL,
 * and nothing that is already live, switched off or long abandoned.
 */
describe('CustomDomainRepository.findPendingVerification', () => {
	let ctx: TestContext;
	let repository: CustomDomainRepository;

	const create = (options: Parameters<typeof createCustomDomainDirectly>[3] = {}) =>
		createCustomDomainDirectly(
			ctx,
			generateCreateCustomDomainDto().domain,
			TEST_USER_PRO_ID,
			options,
		);

	const findIds = async () =>
		(await repository.findPendingVerification(daysAgo(7))).map((domain) => domain.id);

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
		repository = container.resolve(CustomDomainRepository);
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	it('should return domains in both verification phases', async () => {
		const dnsPhase = await create();
		const sslPhase = await create({
			verificationPhase: 'cloudflare_ssl',
			sslStatus: 'pending_validation',
		});

		const ids = await findIds();

		expect(ids).toEqual(expect.arrayContaining([dnsPhase, sslPhase]));
	});

	it('should skip domains that are already active', async () => {
		const active = await create({ verificationPhase: 'cloudflare_ssl', sslStatus: 'active' });

		expect(await findIds()).not.toContain(active);
	});

	it('should skip domains that can no longer succeed', async () => {
		const timedOut = await create({
			verificationPhase: 'cloudflare_ssl',
			sslStatus: 'validation_timed_out',
		});

		expect(await findIds()).not.toContain(timedOut);
	});

	it('should skip disabled domains', async () => {
		const disabled = await create({ isEnabled: false });

		expect(await findIds()).not.toContain(disabled);
	});

	it('should skip domains created before the cutoff', async () => {
		const old = await create();
		await db
			.update(customDomain)
			.set({ createdAt: daysAgo(8) })
			.where(eq(customDomain.id, old));

		expect(await findIds()).not.toContain(old);
	});
});
