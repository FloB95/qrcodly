import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { type McpToolDefinition, type EndpointMeta, splitArgs } from './openapi-to-mcp.js';
import { ApiClient, ApiError } from './api-client.js';
import { logger, logToolCall, type McpClientInfo } from './logger.js';

export function createMcpServer(
	apiKey: string,
	baseUrl: string,
	tools: McpToolDefinition[],
	toolMap: Map<string, EndpointMeta>,
	/** Resolved lazily: the transport only assigns a session id once `initialize` completes. */
	getSessionId: () => string | undefined,
): Server {
	const server = new Server({ name: 'qrcodly', version: '0.1.0' }, { capabilities: { tools: {} } });
	const client = new ApiClient(baseUrl, apiKey);

	const clientInfo = (): McpClientInfo => {
		const version = server.getClientVersion();
		return { name: version?.name, version: version?.version };
	};

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		logger.info(
			{ mcp: { sessionId: getSessionId(), client: clientInfo(), toolCount: tools.length } },
			'mcp.tools.listed',
		);
		return { tools };
	});

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;
		const endpoint = toolMap.get(name);
		const startedAt = performance.now();

		if (!endpoint) {
			logToolCall({
				tool: name,
				outcome: 'error',
				durationMs: performance.now() - startedAt,
				sessionId: getSessionId(),
				client: clientInfo(),
				errorType: 'UnknownTool',
				message: `Unknown tool: ${name}`,
			});
			return {
				content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
				isError: true,
			};
		}

		try {
			const { pathParams, queryParams, body } = splitArgs(args, endpoint);

			const result = await client.request(endpoint.method, endpoint.path, {
				pathParams,
				queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
				body,
			});

			logToolCall({
				tool: name,
				outcome: 'ok',
				durationMs: performance.now() - startedAt,
				sessionId: getSessionId(),
				client: clientInfo(),
			});

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
			};
		} catch (error) {
			const message =
				error instanceof ApiError
					? error.message
					: error instanceof Error
						? error.message
						: String(error);

			logToolCall({
				tool: name,
				outcome: 'error',
				durationMs: performance.now() - startedAt,
				sessionId: getSessionId(),
				client: clientInfo(),
				errorType: error instanceof Error ? error.name : 'Unknown',
				status: error instanceof ApiError ? error.status : undefined,
				message,
			});

			return {
				content: [{ type: 'text' as const, text: message }],
				isError: true,
			};
		}
	});

	return server;
}
