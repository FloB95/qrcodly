import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { type McpToolDefinition, type EndpointMeta } from './openapi-to-mcp.js';
import { createMcpServer } from './mcp-server.js';
import { BASE_URL, PORT, HOST } from './config.js';

const transports = new Map<string, StreamableHTTPServerTransport>();

export async function startServer(
	tools: McpToolDefinition[],
	toolMap: Map<string, EndpointMeta>,
): Promise<void> {
	const app = Fastify({ logger: true });

	await app.register(cors, {
		origin: true,
		exposedHeaders: ['Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'],
	});

	app.post('/mcp', async (request, reply) => {
		const apiKey = extractBearerToken(request.headers);
		if (!apiKey) {
			return reply.status(401).send({
				jsonrpc: '2.0',
				error: {
					code: -32_001,
					message:
						'Missing Authorization header. Pass your QRcodly API key as: Authorization: Bearer <api-key>',
				},
				id: null,
			});
		}

		const sessionId = request.headers['mcp-session-id'] as string | undefined;
		let transport: StreamableHTTPServerTransport;

		if (sessionId && transports.has(sessionId)) {
			transport = transports.get(sessionId)!;
		} else if (!sessionId && isInitializeRequest(request.body)) {
			transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: (sid) => {
					transports.set(sid, transport);
				},
			});

			transport.onclose = () => {
				const sid = transport.sessionId;
				if (sid) transports.delete(sid);
			};

			const server = createMcpServer(apiKey, BASE_URL, tools, toolMap);
			await server.connect(transport);
		} else if (sessionId) {
			return reply.status(404).send({
				jsonrpc: '2.0',
				error: { code: -32_001, message: 'Session not found' },
				id: null,
			});
		} else {
			return reply.status(400).send({
				jsonrpc: '2.0',
				error: {
					code: -32_000,
					message: 'Bad Request: Missing session ID or invalid initialization',
				},
				id: null,
			});
		}

		await transport.handleRequest(request.raw, reply.raw, request.body);
	});

	app.get('/mcp', async (request, reply) => {
		const sessionId = request.headers['mcp-session-id'] as string | undefined;
		if (!sessionId || !transports.has(sessionId)) {
			return reply.status(404).send({
				jsonrpc: '2.0',
				error: { code: -32_001, message: 'Session not found' },
				id: null,
			});
		}
		await transports.get(sessionId)!.handleRequest(request.raw, reply.raw);
	});

	app.delete('/mcp', async (request, reply) => {
		const sessionId = request.headers['mcp-session-id'] as string | undefined;
		if (!sessionId || !transports.has(sessionId)) {
			return reply.status(404).send({
				jsonrpc: '2.0',
				error: { code: -32_001, message: 'Session not found' },
				id: null,
			});
		}
		await transports.get(sessionId)!.handleRequest(request.raw, reply.raw);
	});

	await app.listen({ port: PORT, host: HOST });

	process.once('SIGTERM', () => void shutdown(app));
	process.once('SIGINT', () => void shutdown(app));
}

function extractBearerToken(headers: Record<string, string | string[] | undefined>): string | null {
	const auth = headers['authorization'];
	if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
		return auth.slice(7);
	}
	return null;
}

async function shutdown(app: ReturnType<typeof Fastify>): Promise<void> {
	for (const [sid, transport] of transports) {
		try {
			await transport.close();
		} catch {
			// ignore close errors during shutdown
		}
		transports.delete(sid);
	}
	await app.close();
	process.exit(0);
}
