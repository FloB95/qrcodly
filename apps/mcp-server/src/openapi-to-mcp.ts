type OpenApiSpec = {
	paths: Record<string, Record<string, any>>;
	[key: string]: any;
};

type OpenApiOperation = {
	operationId?: string;
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: OpenApiParameter[];
	requestBody?: {
		content?: {
			'application/json'?: {
				schema?: JsonSchema;
			};
		};
	};
};

type OpenApiParameter = {
	name: string;
	in: string;
	required?: boolean;
	description?: string;
	schema?: JsonSchema;
};

type JsonSchema = {
	type?: string;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	description?: string;
	[key: string]: unknown;
};

export interface EndpointMeta {
	method: string;
	path: string;
	pathParams: string[];
	queryParams: string[];
	hasBody: boolean;
}

export interface McpToolDefinition {
	name: string;
	description: string;
	inputSchema: JsonSchema;
	annotations?: {
		title?: string;
		readOnlyHint?: boolean;
		destructiveHint?: boolean;
		idempotentHint?: boolean;
		openWorldHint?: boolean;
	};
}

// --- Configuration ---

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const EXCLUDED_OPERATIONS = new Set([
	'qr-code/bulk-create-qr-codes', // CSV file upload — not practical over MCP
]);

interface ToolOverride {
	removeFromRequired?: string[];
}

const TOOL_OVERRIDES: Record<string, ToolOverride> = {};

const TOOL_NAME_OVERRIDES: Record<string, string> = {
	'qr-code/get-qr-code-by-id': 'get_qr_code',
	'qr-code/update-qr-code-by-id': 'update_qr_code',
	'qr-code/delete-qr-code-by-id': 'delete_qr_code',
	'qr-code/create-share-link': 'create_qr_code_share',
	'qr-code/get-share-link': 'get_qr_code_share',
	'qr-code/update-share-link': 'update_qr_code_share',
	'qr-code/delete-share-link': 'delete_qr_code_share',
	'template/get-template-by-id': 'get_template',
	'template/update-template-by-id': 'update_template',
	'template/delete-template-id': 'delete_template',
	'short-url/toggle-active-state': 'toggle_short_url_active',
	'short-url/get-analytics': 'get_short_url_analytics',
	'short-url/get-views': 'get_short_url_views',
};

// --- Public API ---

export function buildToolsFromOpenApi(spec: OpenApiSpec): {
	tools: McpToolDefinition[];
	toolMap: Map<string, EndpointMeta>;
} {
	const tools: McpToolDefinition[] = [];
	const toolMap = new Map<string, EndpointMeta>();

	for (const [path, methods] of Object.entries(spec.paths)) {
		for (const httpMethod of HTTP_METHODS) {
			const operation = methods[httpMethod] as OpenApiOperation | undefined;
			if (!operation?.operationId) continue;
			if (EXCLUDED_OPERATIONS.has(operation.operationId)) continue;

			const name = toToolName(operation.operationId);
			const pathParams = extractPathParams(path);
			const { schema: inputSchema, queryParams } = buildInputSchema(operation, pathParams);
			const hasBody = !!operation.requestBody?.content?.['application/json'];

			applyOverrides(name, inputSchema);

			const description = buildDescription(operation, name);
			const annotations = buildAnnotations(httpMethod);

			tools.push({ name, description, inputSchema, annotations });
			toolMap.set(name, {
				method: httpMethod.toUpperCase(),
				path,
				pathParams,
				queryParams,
				hasBody,
			});
		}
	}

	return { tools, toolMap };
}

export function splitArgs(
	args: Record<string, unknown> | undefined,
	endpoint: EndpointMeta,
): {
	pathParams: Record<string, string>;
	queryParams: Record<string, unknown>;
	body: Record<string, unknown> | undefined;
} {
	if (!args) {
		return { pathParams: {}, queryParams: {}, body: undefined };
	}

	const pathParams: Record<string, string> = {};
	const queryParams: Record<string, unknown> = {};
	const body: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(args)) {
		if (endpoint.pathParams.includes(key)) {
			pathParams[key] = String(value);
		} else if (endpoint.queryParams.includes(key)) {
			queryParams[key] = value;
		} else {
			body[key] = value;
		}
	}

	return {
		pathParams,
		queryParams,
		body: endpoint.hasBody && Object.keys(body).length > 0 ? body : undefined,
	};
}

// --- Internal helpers ---

function toToolName(operationId: string): string {
	if (TOOL_NAME_OVERRIDES[operationId]) {
		return TOOL_NAME_OVERRIDES[operationId];
	}
	const afterSlash = operationId.includes('/')
		? operationId.slice(operationId.indexOf('/') + 1)
		: operationId;
	return afterSlash.replace(/-/g, '_');
}

function extractPathParams(path: string): string[] {
	const matches = path.match(/\{(\w+)\}/g);
	if (!matches) return [];
	return matches.map((m) => m.slice(1, -1));
}

function buildInputSchema(
	operation: OpenApiOperation,
	pathParams: string[],
): { schema: JsonSchema; queryParams: string[] } {
	const properties: Record<string, JsonSchema> = {};
	const required: string[] = [];
	const queryParams: string[] = [];

	for (const paramName of pathParams) {
		const paramDef = operation.parameters?.find((p) => p.name === paramName && p.in === 'path');
		properties[paramName] = {
			type: 'string',
			description: paramDef?.description || `Path parameter: ${paramName}`,
		};
		required.push(paramName);
	}

	if (operation.parameters) {
		for (const param of operation.parameters) {
			if (param.in !== 'query') continue;
			queryParams.push(param.name);

			const paramSchema: JsonSchema = param.schema ? { ...param.schema } : { type: 'string' };
			if (param.description) paramSchema.description = param.description;
			properties[param.name] = paramSchema;

			if (param.required) required.push(param.name);
		}
	}

	const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
	if (bodySchema?.properties) {
		for (const [key, value] of Object.entries(bodySchema.properties)) {
			properties[key] = value;
		}
		if (bodySchema.required) required.push(...bodySchema.required);
	}

	const schema: JsonSchema = { type: 'object', properties };
	if (required.length > 0) schema.required = required;

	return { schema, queryParams };
}

function applyOverrides(toolName: string, inputSchema: JsonSchema): void {
	const override = TOOL_OVERRIDES[toolName];
	if (!override?.removeFromRequired || !inputSchema.required) return;

	inputSchema.required = inputSchema.required.filter(
		(r) => !override.removeFromRequired!.includes(r),
	);
	if (inputSchema.required.length === 0) delete inputSchema.required;
}

function buildDescription(operation: OpenApiOperation, fallback: string): string {
	const parts: string[] = [];
	if (operation.summary) parts.push(operation.summary);
	if (operation.description && operation.description !== operation.summary) {
		parts.push(operation.description);
	}
	return parts.join('\n\n') || fallback;
}

function buildAnnotations(httpMethod: string): McpToolDefinition['annotations'] {
	const annotations: McpToolDefinition['annotations'] = {};
	if (httpMethod === 'get') annotations.readOnlyHint = true;
	if (httpMethod === 'delete') annotations.destructiveHint = true;
	return annotations;
}
