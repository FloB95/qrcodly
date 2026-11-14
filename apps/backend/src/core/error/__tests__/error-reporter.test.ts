jest.mock('@/core/config/env', () => ({
	env: {
		...jest.requireActual('@/core/config/env').env,
		LISTMONK_URL: 'https://newsletter.test/',
	},
}));

import { type redactListmonkBreadcrumb } from '../error-reporter';

describe('redactListmonkBreadcrumb', () => {
	let redact: typeof redactListmonkBreadcrumb;

	beforeAll(async () => {
		// the jest setup file loads the reporter before this file's env mock exists
		await jest.isolateModulesAsync(async () => {
			redact = (await import('../error-reporter')).redactListmonkBreadcrumb;
		});
	});

	it('keeps the email in listmonk lookup query strings out of Sentry breadcrumbs', () => {
		const breadcrumb = {
			category: 'http',
			data: {
				url: 'https://newsletter.test/api/subscribers',
				'http.method': 'GET',
				'http.query': '?query=LOWER%28subscribers.email%29+%3D+%27jane%40example.com%27',
				status_code: 503,
			},
		};

		expect(redact(breadcrumb).data).toEqual({
			url: 'https://newsletter.test/api/subscribers',
			'http.method': 'GET',
			status_code: 503,
		});
	});

	it('leaves breadcrumbs of other hosts alone', () => {
		const other = {
			category: 'http',
			data: { url: 'https://api.clerk.com/v1', 'http.query': '?a=1' },
		};

		expect(redact(other)).toBe(other);
	});
});
