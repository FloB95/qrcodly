// =============================================================================
// Shared helpers for k6 load tests
// =============================================================================

import http from 'k6/http';

/**
 * Build request headers with optional Clerk auth
 */
export function getHeaders(clerkToken) {
	const headers = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};

	if (clerkToken) {
		headers['Authorization'] = `Bearer ${clerkToken}`;
	}

	return headers;
}

/**
 * Perform a GET request
 */
export function apiGet(url, token, tags = {}) {
	return http.get(url, {
		headers: getHeaders(token),
		tags,
	});
}

/**
 * Perform a POST request
 */
export function apiPost(url, body, token, tags = {}) {
	return http.post(url, JSON.stringify(body), {
		headers: getHeaders(token),
		tags,
	});
}

/**
 * Perform a PATCH request
 */
export function apiPatch(url, body, token, tags = {}) {
	return http.patch(url, JSON.stringify(body), {
		headers: getHeaders(token),
		tags,
	});
}

/**
 * Perform a PUT request
 */
export function apiPut(url, body, token, tags = {}) {
	return http.put(url, JSON.stringify(body), {
		headers: getHeaders(token),
		tags,
	});
}

/**
 * Perform a DELETE request (no Content-Type header to avoid empty body error)
 */
export function apiDelete(url, token, tags = {}) {
	const headers = { Accept: 'application/json' };
	if (token) headers['Authorization'] = `Bearer ${token}`;

	return http.del(url, null, { headers, tags });
}

/**
 * Generate a random string
 */
export function randomString(length = 8) {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Generate a unique name with prefix
 */
export function uniqueName(prefix = 'k6') {
	return `${prefix}-${randomString(6)}`;
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array
 */
export function randomItem(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Random hex color
 */
export function randomHexColor() {
	const hex = Math.floor(Math.random() * 16777215)
		.toString(16)
		.padStart(6, '0');
	return `#${hex}`;
}
