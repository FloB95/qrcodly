import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { splitArgs } from './openapi-to-mcp.js';
import { ApiClient, ApiError } from './api-client.js';
import { DEFAULT_QR_CONFIG } from './config.js';
const TOOL_DEFAULTS = {
    create_qr_code: { config: DEFAULT_QR_CONFIG },
};
export function createMcpServer(apiKey, baseUrl, tools, toolMap) {
    const server = new Server({ name: 'qrcodly', version: '0.1.0' }, { capabilities: { tools: {} } });
    const client = new ApiClient(baseUrl, apiKey);
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const endpoint = toolMap.get(name);
        if (!endpoint) {
            return {
                content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                isError: true,
            };
        }
        try {
            const resolvedArgs = applyDefaults(name, args);
            const { pathParams, queryParams, body } = splitArgs(resolvedArgs, endpoint);
            const result = await client.request(endpoint.method, endpoint.path, {
                pathParams,
                queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
                body,
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            const message = error instanceof ApiError
                ? error.message
                : error instanceof Error
                    ? error.message
                    : String(error);
            return {
                content: [{ type: 'text', text: message }],
                isError: true,
            };
        }
    });
    return server;
}
function applyDefaults(toolName, args) {
    const resolved = { ...(args || {}) };
    const defaults = TOOL_DEFAULTS[toolName];
    if (!defaults)
        return resolved;
    for (const [key, value] of Object.entries(defaults)) {
        if (!(key in resolved)) {
            resolved[key] = value;
        }
    }
    return resolved;
}
//# sourceMappingURL=mcp-server.js.map