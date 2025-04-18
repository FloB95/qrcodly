import { Server } from '@/core/server';
import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { ShutdownService } from '@/core/shutdown/ShutdownService';

export async function setupTestServer(): Promise<FastifyInstance> {
	const testServer = await container.resolve(Server).build();
	await testServer.server.ready();
	return testServer.server;
}

export async function getTestServerWithUserAuth() {
	const testServer = await setupTestServer();

	return {
		testServer,
	};
}

export async function shutDownServer() {
	const shutdownService = container.resolve(ShutdownService);
	shutdownService.shutdown();
	await shutdownService.waitForShutdown();
}
