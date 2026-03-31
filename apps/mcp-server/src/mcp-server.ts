import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { type McpToolDefinition, type EndpointMeta, splitArgs } from './openapi-to-mcp.js';
import { ApiClient, ApiError } from './api-client.js';

export function createMcpServer(
	apiKey: string,
	baseUrl: string,
	tools: McpToolDefinition[],
	toolMap: Map<string, EndpointMeta>,
): Server {
	const server = new Server({ name: 'qrcodly', version: '0.1.0' }, { capabilities: { tools: {} } });
	const client = new ApiClient(baseUrl, apiKey);

	server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;
		const endpoint = toolMap.get(name);

		if (!endpoint) {
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

			return {
				content: [{ type: 'text' as const, text: message }],
				isError: true,
			};
		}
	});

	return server;
}
