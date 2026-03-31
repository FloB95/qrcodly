import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { type McpToolDefinition, type EndpointMeta } from './openapi-to-mcp.js';
import { createMcpServer } from './mcp-server.js';
import { env } from './env.js';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

interface SessionEntry {
	transport: StreamableHTTPServerTransport;
	lastActivity: number;
}

const sessions = new Map<string, SessionEntry>();

export async function startServer(
	tools: McpToolDefinition[],
	toolMap: Map<string, EndpointMeta>,
): Promise<void> {
	const app = Fastify({ logger: true });

	await app.register(cors, {
		origin: true,
		exposedHeaders: ['Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'],
	});

	// Landing page — shown when someone visits the root URL in a browser
	app.get('/', async (_request, reply) => {
		return reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>QRcodly MCP Server</title>
	<style>
		body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 80px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
		h1 { font-size: 1.5rem; }
		code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
		a { color: #2563eb; }
		.endpoint { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
	</style>
</head>
<body>
	<h1>QRcodly MCP Server</h1>
	<p>This is the <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server for <a href="https://qrcodly.com">QRcodly</a>.</p>
	<p>Connect your AI assistant (Claude, ChatGPT, Cursor, VS Code, etc.) to create and manage QR codes by chatting.</p>
	<div class="endpoint">
		<strong>MCP Endpoint:</strong> <code>https://mcp.qrcodly.de/mcp</code>
	</div>
	<p><a href="https://qrcodly.com/docs/guides/mcp-server">Setup Guide &rarr;</a></p>
</body>
</html>`);
	});

	app.get('/robots.txt', async (_request, reply) => {
		return reply.type('text/plain').send('User-agent: *\nDisallow: /\n');
	});

	app.get('/health', async (_request, reply) => {
		return reply.send({ status: 'ok', sessions: sessions.size });
	});

	// --- MCP Streamable HTTP Transport ---

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

		if (sessionId && sessions.has(sessionId)) {
			const entry = sessions.get(sessionId)!;
			entry.lastActivity = Date.now();
			transport = entry.transport;
		} else if (!sessionId && isInitializeRequest(request.body)) {
			transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: (sid) => {
					sessions.set(sid, { transport, lastActivity: Date.now() });
				},
			});

			transport.onclose = () => {
				const sid = transport.sessionId;
				if (sid) sessions.delete(sid);
			};

			const server = createMcpServer(apiKey, env.QRCODLY_API_BASE_URL, tools, toolMap);
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
		if (!sessionId || !sessions.has(sessionId)) {
			return reply.status(404).send({
				jsonrpc: '2.0',
				error: { code: -32_001, message: 'Session not found' },
				id: null,
			});
		}
		sessions.get(sessionId)!.lastActivity = Date.now();
		await sessions.get(sessionId)!.transport.handleRequest(request.raw, reply.raw);
	});

	app.delete('/mcp', async (request, reply) => {
		const sessionId = request.headers['mcp-session-id'] as string | undefined;
		if (!sessionId || !sessions.has(sessionId)) {
			return reply.status(404).send({
				jsonrpc: '2.0',
				error: { code: -32_001, message: 'Session not found' },
				id: null,
			});
		}
		await sessions.get(sessionId)!.transport.handleRequest(request.raw, reply.raw);
	});

	// Clean up stale sessions to prevent memory leaks
	const cleanupInterval = setInterval(() => {
		const now = Date.now();
		for (const [sid, entry] of sessions) {
			if (now - entry.lastActivity > SESSION_TTL_MS) {
				entry.transport.close().catch(() => {});
				sessions.delete(sid);
			}
		}
	}, SESSION_CLEANUP_INTERVAL_MS);

	await app.listen({ port: env.PORT, host: env.HOST });

	process.once('SIGTERM', () => void shutdown(app, cleanupInterval));
	process.once('SIGINT', () => void shutdown(app, cleanupInterval));
}

function extractBearerToken(headers: Record<string, string | string[] | undefined>): string | null {
	const auth = headers['authorization'];
	if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
		return auth.slice(7);
	}
	return null;
}

async function shutdown(
	app: ReturnType<typeof Fastify>,
	cleanupInterval: NodeJS.Timeout,
): Promise<void> {
	clearInterval(cleanupInterval);
	for (const [sid, entry] of sessions) {
		try {
			await entry.transport.close();
		} catch {
			// ignore close errors during shutdown
		}
		sessions.delete(sid);
	}
	await app.close();
	process.exit(0);
}
