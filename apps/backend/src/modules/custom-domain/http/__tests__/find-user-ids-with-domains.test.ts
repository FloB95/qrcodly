import { container } from 'tsyringe';
import { resetTestState } from '@/tests/shared/test-context';
import CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import {
	getTestContext,
	createCustomDomainDirectly,
	cleanupCreatedDomains,
	generateCreateCustomDomainDto,
	TEST_USER_PRO_ID,
	TEST_USER_2_ID,
	type TestContext,
} from './utils';

/**
 * Backs the periodic limit sweep, which is the only thing that repairs entitlement drift when no
 * billing event ever arrives. It has to reach every owner exactly once.
 */
describe('CustomDomainRepository.findUserIdsWithDomains', () => {
	let ctx: TestContext;
	let repository: CustomDomainRepository;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
		repository = container.resolve(CustomDomainRepository);
	});

	afterEach(async () => {
		await cleanupCreatedDomains(ctx);
	});

	it('should return each owner once, however many domains they have', async () => {
		await createCustomDomainDirectly(ctx, generateCreateCustomDomainDto().domain, TEST_USER_PRO_ID);
		await createCustomDomainDirectly(ctx, generateCreateCustomDomainDto().domain, TEST_USER_PRO_ID);
		await createCustomDomainDirectly(ctx, generateCreateCustomDomainDto().domain, TEST_USER_2_ID);

		const userIds = await repository.findUserIdsWithDomains();

		expect(userIds.filter((id) => id === TEST_USER_PRO_ID)).toHaveLength(1);
		expect(userIds).toContain(TEST_USER_2_ID);
	});

	it('should not return an owner whose domains are all gone', async () => {
		await createCustomDomainDirectly(ctx, generateCreateCustomDomainDto().domain, TEST_USER_PRO_ID);
		await cleanupCreatedDomains(ctx);

		const userIds = await repository.findUserIdsWithDomains();

		expect(userIds).not.toContain(TEST_USER_PRO_ID);
	});
});
