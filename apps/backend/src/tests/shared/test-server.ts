import { Server } from '@/core/server';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { ShutdownService } from '@/core/shutdown/ShutdownService';
import { clerkClient } from '@clerk/fastify';
import { CLERK_JWT_TEMPLATE } from '@/modules/qr-code/config/constants';

const TEST_USER_ID = 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T';
const TEST_USER_2_ID = 'user_2vxx4UoYRjT2mi1I4FMFEbpzbAA';

async function setupTestServer(): Promise<FastifyInstance> {
	const testServer = await container.resolve(Server).build();
	await testServer.server.ready();
	return testServer.server;
}

async function getTestUser(userId: string = TEST_USER_ID) {
	// Create a new test user if it doesn't exist
	const user = await clerkClient.users.getUser(userId);
	const session = await clerkClient.sessions.createSession({
		userId: user.id,
	});
	const accessToken = (await clerkClient.sessions.getToken(session.id, CLERK_JWT_TEMPLATE)).jwt;
	return { user, accessToken };
}

export async function getTestServerWithUserAuth() {
	const testServer = await setupTestServer();
	const { user, accessToken } = await getTestUser();
	const { user: user2, accessToken: accessToken2 } = await getTestUser(TEST_USER_2_ID);

	return {
		testServer,
		accessToken,
		accessToken2,
		user,
		user2,
	};
}

export async function shutDownServer() {
	const shutdownService = container.resolve(ShutdownService);
	shutdownService.shutdown();
	await shutdownService.waitForShutdown();
}
