// --- Configuration ---
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const EXCLUDED_OPERATIONS = new Set([
    'qr-code/bulk-create-qr-codes', // CSV file upload — not practical over MCP
]);
const TOOL_OVERRIDES = {
    create_qr_code: { removeFromRequired: ['config'] },
};
const TOOL_NAME_OVERRIDES = {
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
export function buildToolsFromOpenApi(spec) {
    const tools = [];
    const toolMap = new Map();
    for (const [path, methods] of Object.entries(spec.paths)) {
        for (const httpMethod of HTTP_METHODS) {
            const operation = methods[httpMethod];
            if (!operation?.operationId)
                continue;
            if (EXCLUDED_OPERATIONS.has(operation.operationId))
                continue;
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
export function splitArgs(args, endpoint) {
    if (!args) {
        return { pathParams: {}, queryParams: {}, body: undefined };
    }
    const pathParams = {};
    const queryParams = {};
    const body = {};
    for (const [key, value] of Object.entries(args)) {
        if (endpoint.pathParams.includes(key)) {
            pathParams[key] = String(value);
        }
        else if (endpoint.queryParams.includes(key)) {
            queryParams[key] = value;
        }
        else {
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
function toToolName(operationId) {
    if (TOOL_NAME_OVERRIDES[operationId]) {
        return TOOL_NAME_OVERRIDES[operationId];
    }
    const afterSlash = operationId.includes('/')
        ? operationId.slice(operationId.indexOf('/') + 1)
        : operationId;
    return afterSlash.replace(/-/g, '_');
}
function extractPathParams(path) {
    const matches = path.match(/\{(\w+)\}/g);
    if (!matches)
        return [];
    return matches.map((m) => m.slice(1, -1));
}
function buildInputSchema(operation, pathParams) {
    const properties = {};
    const required = [];
    const queryParams = [];
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
            if (param.in !== 'query')
                continue;
            queryParams.push(param.name);
            const paramSchema = param.schema ? { ...param.schema } : { type: 'string' };
            if (param.description)
                paramSchema.description = param.description;
            properties[param.name] = paramSchema;
            if (param.required)
                required.push(param.name);
        }
    }
    const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
    if (bodySchema?.properties) {
        for (const [key, value] of Object.entries(bodySchema.properties)) {
            properties[key] = value;
        }
        if (bodySchema.required)
            required.push(...bodySchema.required);
    }
    const schema = { type: 'object', properties };
    if (required.length > 0)
        schema.required = required;
    return { schema, queryParams };
}
function applyOverrides(toolName, inputSchema) {
    const override = TOOL_OVERRIDES[toolName];
    if (!override?.removeFromRequired || !inputSchema.required)
        return;
    inputSchema.required = inputSchema.required.filter((r) => !override.removeFromRequired.includes(r));
    if (inputSchema.required.length === 0)
        delete inputSchema.required;
}
function buildDescription(operation, fallback) {
    const parts = [];
    if (operation.summary)
        parts.push(operation.summary);
    if (operation.description && operation.description !== operation.summary) {
        parts.push(operation.description);
    }
    return parts.join('\n\n') || fallback;
}
function buildAnnotations(httpMethod) {
    const annotations = {};
    if (httpMethod === 'get')
        annotations.readOnlyHint = true;
    if (httpMethod === 'delete')
        annotations.destructiveHint = true;
    return annotations;
}
//# sourceMappingURL=openapi-to-mcp.js.map