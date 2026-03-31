export class ApiClient {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.apiKey = apiKey;
    }
    async request(method, path, options) {
        let resolvedPath = path;
        if (options?.pathParams) {
            for (const [key, value] of Object.entries(options.pathParams)) {
                resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(value));
            }
        }
        let queryString = '';
        if (options?.queryParams && Object.keys(options.queryParams).length > 0) {
            queryString = `?${serializeQueryParams(options.queryParams)}`;
        }
        const url = `${this.baseUrl}/api/v1${resolvedPath}${queryString}`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
        };
        const fetchOptions = { method, headers };
        if (options?.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(options.body);
        }
        const response = await fetch(url, fetchOptions);
        const contentType = response.headers.get('content-type') || '';
        const responseBody = contentType.includes('application/json')
            ? await response.json()
            : await response.text();
        if (!response.ok) {
            throw new ApiError(response.status, responseBody);
        }
        return responseBody;
    }
}
export class ApiError extends Error {
    status;
    body;
    constructor(status, body) {
        super(formatErrorMessage(status, body));
        this.status = status;
        this.body = body;
        this.name = 'ApiError';
    }
}
function formatErrorMessage(status, body) {
    const bodyMessage = typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : '';
    switch (status) {
        case 400:
            return `Bad request: ${bodyMessage || 'Validation failed. Check your input parameters.'}`;
        case 401:
            return 'Invalid or expired API key. Check your Authorization header.';
        case 403:
            return `Access denied. ${bodyMessage || 'You can only access your own resources.'}`;
        case 404:
            return `Resource not found. ${bodyMessage || 'Verify the ID or short code is correct.'}`;
        case 429:
            return 'Rate limit exceeded. Please wait before making more requests.';
        default:
            if (status >= 500) {
                return `QRcodly API server error (${status}). Please try again later.`;
            }
            return `API request failed with status ${status}: ${bodyMessage || 'Unknown error'}`;
    }
}
/**
 * Serializes nested query params into bracket notation.
 * { where: { name: { like: "foo" } } } → "where[name][like]=foo"
 */
function serializeQueryParams(params) {
    const parts = [];
    function flatten(obj, prefix) {
        if (obj === null || obj === undefined)
            return;
        if (Array.isArray(obj)) {
            for (const item of obj) {
                parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(item))}`);
            }
        }
        else if (typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                flatten(value, prefix ? `${prefix}[${key}]` : key);
            }
        }
        else {
            parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
        }
    }
    flatten(params, '');
    return parts.join('&');
}
//# sourceMappingURL=api-client.js.map