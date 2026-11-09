import type { FastifyInstance } from 'fastify';
import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/modules/qr-code/http/__tests__/utils';

type TNode = { [key: string]: unknown };

const collectEnums = (node: unknown, found: unknown[][] = []): unknown[][] => {
	if (Array.isArray(node)) {
		for (const entry of node) collectEnums(entry, found);
	} else if (node && typeof node === 'object') {
		const record = node as TNode;
		if (Array.isArray(record.enum)) found.push(record.enum);
		for (const value of Object.values(record)) collectEnums(value, found);
	}
	return found;
};

/** Request bodies and parameters of every operation, without the responses. */
const requestSchemasOf = (spec: { paths: Record<string, unknown> }): unknown[] =>
	Object.values(spec.paths).flatMap((operations) =>
		Object.values(operations as Record<string, TNode>).map((operation) => ({
			...operation,
			responses: undefined,
		})),
	);

describe('OpenAPI document', () => {
	let testServer: FastifyInstance;

	beforeAll(async () => {
		testServer = (await getTestContext()).testServer;
	});

	it('leaves hosted pages out of the public API docs', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${API_BASE_PATH}/openapi.json`,
		});
		expect(response).toHaveStatusCode(200);
		const spec = JSON.parse(response.payload) as { paths: Record<string, unknown> };

		expect(Object.keys(spec.paths).filter((path) => path.includes('hosted'))).toEqual([]);
		// the PDF content schema is not documented anywhere
		expect(response.payload).not.toContain('openMode');
		// what clients send: every list of QR code content types stops at the public ones
		const requestLists = collectEnums(requestSchemasOf(spec)).filter((values) =>
			values.includes('whatsapp'),
		);
		expect(requestLists.length).toBeGreaterThan(0);
		for (const values of requestLists) expect(values).not.toContain('pdf');
	});

	it('keeps hosted content readable in responses, as an opaque member', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${API_BASE_PATH}/openapi.json`,
		});
		const spec = JSON.parse(response.payload) as { paths: Record<string, TNode> };
		const [, listRoute] =
			Object.entries(spec.paths).find(([path]) => /\/qr-code\/?$/.test(path)) ?? [];
		const listResponse = JSON.stringify(listRoute?.get);
		// a code list may contain a PDF page: generated clients must be able to parse it
		expect(listResponse).toContain('"pdf"');
		expect(listResponse).toContain('Not covered by this documentation');
		expect(listResponse).not.toContain('openMode');
	});

	it('leaves the URL safety findings out of the docs, while the routes keep working', async () => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${API_BASE_PATH}/openapi.json`,
		});
		const spec = JSON.parse(response.payload) as { paths: Record<string, unknown> };
		expect(Object.keys(spec.paths).filter((path) => path.includes('safety-incidents'))).toEqual([]);

		// only hidden: the routes still answer (here: no login)
		for (const [method, path] of [
			['GET', '/short-url/safety-incidents'],
			['POST', '/short-url/safety-incidents/acknowledge'],
		] as const) {
			const route = await testServer.inject({ method, url: `${API_BASE_PATH}${path}` });
			expect(route).toHaveStatusCode(401);
		}
	});
});
