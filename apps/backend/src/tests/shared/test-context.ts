import { Server } from '@/core/server';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { ShutdownService } from '@/core/services/shutdown.service';
import { clerkClient } from '@clerk/fastify';
import { CLERK_JWT_TEMPLATE } from '@/core/config/constants';
import { poolConnection } from '@/core/db';
import { KeyCache } from '@/core/cache';
import { ObjectStorage } from '@/core/storage';
import { cleanUpMockData } from '@/core/db/mock';

// Test user IDs - exported for use in module-specific test utilities
export const TEST_USER_ID = 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T';
export const TEST_USER_2_ID = 'user_36wbOOFSWfYDUf7zA4L2ucTZWYL';
export const TEST_USER_PRO_ID = 'user_2vxx4UoYRjT2mi1I4FMFEbpzbAA';

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
	user: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
	user2: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
	userPro: Awaited<ReturnType<typeof clerkClient.users.getUser>>;
}

/**
 * Singleton test context manager.
 * Ensures only ONE server instance exists across all test files.
 */
class TestContextManager {
	private static instance: TestContextManager;
	private context: TestContext | null = null;
	private initPromise: Promise<TestContext> | null = null;
	private isShuttingDown = false;

	private constructor() {}

	static getInstance(): TestContextManager {
		if (!TestContextManager.instance) {
			TestContextManager.instance = new TestContextManager();
		}
		return TestContextManager.instance;
	}

	/**
	 * Gets the test context, creating it if it doesn't exist.
	 * Thread-safe - multiple concurrent calls will wait for the same initialization.
	 */
	async getContext(): Promise<TestContext> {
		if (this.isShuttingDown) {
			throw new Error('Cannot get context while shutting down');
		}

		if (this.context) {
			return this.context;
		}

		// If initialization is in progress, wait for it
		if (this.initPromise) {
			return this.initPromise;
		}

		// Start initialization
		this.initPromise = this.initialize();
		this.context = await this.initPromise;
		this.initPromise = null;

		return this.context;
	}

	private async initialize(): Promise<TestContext> {
		// Setup test server
		const testServer = await container.resolve(Server).build();
		await testServer.server.ready();

		// Get test users and tokens
		const [
			{ user, accessToken },
			{ user: user2, accessToken: accessToken2 },
			{ user: userPro, accessToken: accessTokenPro },
		] = await Promise.all([
			this.getTestUser(TEST_USER_ID),
			this.getTestUser(TEST_USER_2_ID),
			this.getTestUser(TEST_USER_PRO_ID),
		]);

		return {
			testServer: testServer.server,
			accessToken,
			accessToken2,
			accessTokenPro,
			user,
			user2,
			userPro,
		};
	}

	private async getTestUser(userId: string) {
		const user = await clerkClient.users.getUser(userId);
		const session = await clerkClient.sessions.createSession({
			userId: user.id,
		});
		const tokenResponse = await clerkClient.sessions.getToken(session.id, CLERK_JWT_TEMPLATE);
		if (!tokenResponse?.jwt) {
			throw new Error(`Failed to get JWT for test user ${userId}`);
		}
		const accessToken = tokenResponse.jwt;
		return { user, accessToken };
	}

	/**
	 * Performs cleanup before all tests run.
	 * Called once at the start of the test suite.
	 */
	async beforeAllTests(): Promise<void> {
		// Clean up Redis cache
		await container.resolve(KeyCache).flushAllCache();
		// Clean up the database
		await cleanUpMockData();
	}

	/**
	 * Performs cleanup after all tests complete.
	 * Called once at the end of the test suite.
	 */
	async afterAllTests(): Promise<void> {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;

		try {
			// Clean up test data
			await cleanUpMockData();

			// Clean up S3 test directory
			try {
				await container.resolve(ObjectStorage).emptyS3Directory('test/');
			} catch (error) {
				// Ignore S3 cleanup errors in tests
				console.warn('S3 cleanup warning:', error);
			}

			// Shutdown the server if it was initialized
			if (this.context) {
				const shutdownService = container.resolve(ShutdownService);
				shutdownService.shutdown();
				await shutdownService.waitForShutdown();
			}

			// Close database connection pool LAST
			// Add a small delay to ensure all pending queries complete
			await new Promise((resolve) => setTimeout(resolve, 100));
			await poolConnection.end();
		} catch (error) {
			console.error('Error during test cleanup:', error);
		} finally {
			this.context = null;
			this.isShuttingDown = false;
		}
	}
}

// Export singleton instance methods
const manager = TestContextManager.getInstance();

export const getTestContext = () => manager.getContext();
export const beforeAllTests = () => manager.beforeAllTests();
export const afterAllTests = () => manager.afterAllTests();
