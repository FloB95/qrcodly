import { buildToolsFromOpenApi } from './openapi-to-mcp.js';
import { startServer } from './server.js';
import spec from './openapi.json' with { type: 'json' };

const { tools, toolMap } = buildToolsFromOpenApi(spec as any);

console.log(`Loaded ${tools.length} MCP tools from OpenAPI spec`);

void startServer(tools, toolMap);
