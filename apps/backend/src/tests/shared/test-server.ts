import { Server } from '@/core/server';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { ShutdownService } from '@/core/services/shutdown.service';
import { clerkClient } from '@clerk/fastify';
import { CLERK_JWT_TEMPLATE } from '@/core/config/constants';

const TEST_USER_ID = 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T';
const TEST_USER_2_ID = 'user_36wbOOFSWfYDUf7zA4L2ucTZWYL';
const TEST_USER_PRO_ID = 'user_2vxx4UoYRjT2mi1I4FMFEbpzbAA';

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
	const { user: userPro, accessToken: accessTokenPro } = await getTestUser(TEST_USER_PRO_ID);

	return {
		testServer,
		accessToken,
		accessToken2,
		accessTokenPro,
		user,
		user2,
		userPro,
	};
}

export async function shutDownServer() {
	const shutdownService = container.resolve(ShutdownService);
	shutdownService.shutdown();
	await shutdownService.waitForShutdown();
}
