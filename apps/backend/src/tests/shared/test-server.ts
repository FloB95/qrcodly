import { Server } from '@/core/server';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { ShutdownService } from '@/core/shutdown/ShutdownService';
import { clerkClient } from '@clerk/fastify';
import { CLERK_JWT_TEMPLATE } from '@/modules/qr-code/config/constants';

const TEST_USER_ID = 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T';

async function setupTestServer(): Promise<FastifyInstance> {
	const testServer = await container.resolve(Server).build();
	await testServer.server.ready();
	return testServer.server;
}

async function getTestUser() {
	// Create a new test user if it doesn't exist
	const user = await clerkClient.users.getUser(TEST_USER_ID);
	const session = await clerkClient.sessions.createSession({
		userId: user.id,
	});
	const accessToken = (await clerkClient.sessions.getToken(session.id, CLERK_JWT_TEMPLATE)).jwt;
	return { user, accessToken };
}

export async function deleteTestUser(userId: string) {
	try {
		await clerkClient.users.deleteUser(userId);
	} catch (error) {
		console.error(`Failed to delete test user: ${(error as Error).message}`);
	}
}

export async function getTestServerWithUserAuth() {
	const testServer = await setupTestServer();
	const { user, accessToken } = await getTestUser();

	return {
		testServer,
		accessToken: accessToken,
		user,
	};
}

export async function shutDownServer() {
	const shutdownService = container.resolve(ShutdownService);
	shutdownService.shutdown();
	await shutdownService.waitForShutdown();
}
