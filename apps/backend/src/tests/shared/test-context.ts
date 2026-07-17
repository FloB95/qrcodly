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
import { sleep } from '@/utils/general';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

	/**
	 * Clerk sessions/tokens are cached in-memory and on disk so the whole test
	 * run needs only a handful of Clerk API calls instead of ~9 per suite —
	 * otherwise Clerk's rate limit (429) kills the run. The disk cache also
	 * survives Jest worker recycling.
	 */
	private userCache = new Map<string, Awaited<ReturnType<typeof clerkClient.users.getUser>>>();

	private async getTestUser(userId: string) {
		let user = this.userCache.get(userId);
		if (!user) {
			user = await withClerkRetry(() => clerkClient.users.getUser(userId));
			this.userCache.set(userId, user);
		}

		const cached = readTokenCache()[userId];
		if (cached?.jwt && cached.jwtExpMs - 15_000 > Date.now()) {
			return { user, accessToken: cached.jwt };
		}

		let sessionId: string | undefined = cached?.sessionId;
		let jwt: string | undefined;

		if (sessionId) {
			try {
				const tokenResponse = await withClerkRetry(() =>
					clerkClient.sessions.getToken(sessionId!, CLERK_JWT_TEMPLATE),
				);
				jwt = tokenResponse?.jwt;
			} catch (error) {
				// Only discard the cached session when Clerk says it is actually
				// gone/invalid. On transient failures (exhausted 429 retries, 5xx,
				// network) rethrow instead of creating a fresh session, so we don't
				// pile more load onto Clerk during an outage or rate limit.
				const status = (error as { status?: number })?.status;
				if (status === 401 || status === 403 || status === 404 || status === 410) {
					sessionId = undefined;
				} else {
					throw error;
				}
			}
		}

		if (!jwt) {
			const session = await withClerkRetry(() =>
				clerkClient.sessions.createSession({ userId: user.id }),
			);
			sessionId = session.id;
			const tokenResponse = await withClerkRetry(() =>
				clerkClient.sessions.getToken(session.id, CLERK_JWT_TEMPLATE),
			);
			jwt = tokenResponse?.jwt;
		}

		if (!jwt || !sessionId) {
			throw new Error(`Failed to get JWT for test user ${userId}`);
		}

		writeTokenCache(userId, { sessionId, jwt, jwtExpMs: decodeJwtExpMs(jwt) });
		return { user, accessToken: jwt };
	}

	/**
	 * Performs cleanup before all tests run.
	 * Called once at the start of the test suite.
	 */
	async beforeAllTests(): Promise<void> {
		await container.resolve(KeyCache).flushAllCache();
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
			await cleanUpMockData();

			try {
				await container.resolve(ObjectStorage).emptyS3Directory('test/');
			} catch (error) {
				console.warn('S3 cleanup warning:', error);
			}

			const shutdownService = container.resolve(ShutdownService);
			if (!shutdownService.isShuttingDown()) {
				shutdownService.shutdown();
				await shutdownService.waitForShutdown();
			}

			await poolConnection.end();
			await sleep(100);
		} catch (error) {
			console.error('Error during test cleanup:', error);
		} finally {
			container.clearInstances();
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

/**
 * Resets test state by flushing cache and cleaning up mock data.
 * Call this at the start of each test file's beforeAll to ensure isolation.
 */
export const resetTestState = async () => {
	await container.resolve(KeyCache).flushAllCache();
	await cleanUpMockData();
};

// --- Clerk API helpers (rate-limit protection) ---

const TOKEN_CACHE_FILE = join(tmpdir(), 'qrcodly-clerk-test-cache.json');

type CachedToken = { sessionId: string; jwt: string; jwtExpMs: number };

function readTokenCache(): Record<string, CachedToken> {
	try {
		if (existsSync(TOKEN_CACHE_FILE)) {
			return JSON.parse(readFileSync(TOKEN_CACHE_FILE, 'utf8')) as Record<string, CachedToken>;
		}
	} catch {
		// corrupted cache -> start fresh
	}
	return {};
}

function writeTokenCache(userId: string, entry: CachedToken): void {
	try {
		const cache = readTokenCache();
		cache[userId] = entry;
		// Owner-only: the file holds live JWTs and session IDs. writeFileSync only
		// applies mode when creating, so chmod an existing file to tighten it too.
		writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache), { mode: 0o600 });
		chmodSync(TOKEN_CACHE_FILE, 0o600);
	} catch {
		// cache is an optimization only - never fail a test because of it
	}
}

function decodeJwtExpMs(jwt: string): number {
	try {
		const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()) as {
			exp?: number;
		};
		return (payload.exp ?? 0) * 1000;
	} catch {
		return 0;
	}
}

/** Retries Clerk API calls on 429 with increasing backoff. */
async function withClerkRetry<T>(fn: () => Promise<T>): Promise<T> {
	const delaysMs = [2000, 8000, 20000];
	for (let attempt = 0; ; attempt++) {
		try {
			return await fn();
		} catch (error) {
			const status = (error as { status?: number })?.status;
			if (status !== 429 || attempt >= delaysMs.length) {
				throw error;
			}
			await sleep(delaysMs[attempt]);
		}
	}
}
