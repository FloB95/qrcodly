import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';

const mockClerk = { users: { getUser: jest.fn(), getUserList: jest.fn() } };
jest.mock('@clerk/fastify', () => ({
	...jest.requireActual('@clerk/fastify'),
	createClerkClient: jest.fn(() => mockClerk),
}));

const mockTrackExternal = jest.fn((_provider: string, _operation: string, fn: () => unknown) =>
	fn(),
);
jest.mock('@/core/metrics', () => ({
	...jest.requireActual('@/core/metrics'),
	trackExternal: (provider: string, operation: string, fn: () => unknown) =>
		mockTrackExternal(provider, operation, fn),
}));

import { type Logger } from '@/core/logging';
import { type ClerkUserInfoService } from '../clerk-user-info.service';

describe('ClerkUserInfoService', () => {
	let Service: typeof ClerkUserInfoService;
	let logger: MockProxy<Logger>;
	let service: ClerkUserInfoService;

	beforeAll(async () => {
		// the jest setup file loads the service before this file's Clerk mock exists
		await jest.isolateModulesAsync(async () => {
			Service = (await import('../clerk-user-info.service')).ClerkUserInfoService;
		});
	});

	beforeEach(() => {
		logger = mock<Logger>();
		service = new Service(logger);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getUserInfo', () => {
		it('returns the first email address and the first name', async () => {
			mockClerk.users.getUser.mockResolvedValue({
				emailAddresses: [{ emailAddress: 'jane@example.com' }],
				firstName: 'Jane',
			});

			await expect(service.getUserInfo('user_1')).resolves.toEqual({
				email: 'jane@example.com',
				firstName: 'Jane',
			});
		});

		it('fails soft with an empty address', async () => {
			mockClerk.users.getUser.mockRejectedValue(new Error('Clerk down'));

			await expect(service.getUserInfo('user_1')).resolves.toEqual({ email: '' });
			expect(logger.error).toHaveBeenCalledWith('clerk.getUserInfo.failed', {
				user: { id: 'user_1' },
				error: expect.any(Error),
			});
		});
	});

	describe('getUser', () => {
		it('returns the Clerk user and records the call', async () => {
			const user = { id: 'user_1' };
			mockClerk.users.getUser.mockResolvedValue(user);

			await expect(service.getUser('user_1')).resolves.toBe(user);

			expect(mockClerk.users.getUser).toHaveBeenCalledWith('user_1');
			expect(mockTrackExternal).toHaveBeenCalledWith(
				'clerk',
				'users.getUser',
				expect.any(Function),
			);
		});

		it('passes the Clerk error on, so a 404 stays detectable', async () => {
			const notFound = Object.assign(new Error('Not Found'), { status: 404 });
			mockClerk.users.getUser.mockRejectedValue(notFound);

			await expect(service.getUser('user_gone')).rejects.toBe(notFound);
			expect(logger.error).not.toHaveBeenCalled();
		});
	});

	describe('listUsers', () => {
		it('returns one page, oldest first, and records the call', async () => {
			const users = [{ id: 'user_1' }, { id: 'user_2' }];
			mockClerk.users.getUserList.mockResolvedValue({ data: users, totalCount: 900 });

			await expect(service.listUsers({ limit: 500, offset: 500 })).resolves.toBe(users);

			expect(mockClerk.users.getUserList).toHaveBeenCalledWith({
				limit: 500,
				offset: 500,
				orderBy: '+created_at',
			});
			expect(mockTrackExternal).toHaveBeenCalledWith(
				'clerk',
				'users.getUserList',
				expect.any(Function),
			);
		});

		it('throws when the listing fails instead of returning a partial page', async () => {
			mockClerk.users.getUserList.mockRejectedValue(new Error('Clerk down'));

			await expect(service.listUsers({ limit: 500, offset: 0 })).rejects.toThrow('Clerk down');
		});
	});
});
