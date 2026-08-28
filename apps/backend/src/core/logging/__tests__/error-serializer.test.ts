import { errorSerializer } from '../logger';

describe('errorSerializer', () => {
	it('makes a raw Error serializable — it would otherwise log as {}', () => {
		const error = new Error('Unexpected end of multipart data');

		expect(JSON.stringify(error)).toBe('{}');

		const serialized = errorSerializer(error) as Record<string, unknown>;
		expect(serialized.type).toBe('Error');
		expect(serialized.message).toBe('Unexpected end of multipart data');
		expect(serialized.stack).toEqual(expect.stringContaining('Unexpected end of multipart data'));
	});

	it('keeps custom properties such as the error code', () => {
		const error = Object.assign(new Error('boom'), { code: 'ECONNRESET' });

		const serialized = errorSerializer(error) as Record<string, unknown>;
		expect(serialized.code).toBe('ECONNRESET');
	});

	it('carries the subclass name through as the type', () => {
		class NotFoundError extends Error {}

		const serialized = errorSerializer(new NotFoundError('nope')) as Record<string, unknown>;
		expect(serialized.type).toBe('NotFoundError');
	});

	it('passes hand-built error objects through untouched', () => {
		// fastifyErrorHandler logs a plain object here; pino's own serializer would rewrite
		// `type` to "Object" and bolt on an empty stack.
		const payload = { type: 'BadRequestError', message: 'invalid', statusCode: 400 };

		expect(errorSerializer(payload)).toBe(payload);
	});

	it.each([
		['undefined', undefined],
		['null', null],
		['a string', 'something went wrong'],
	])('passes %s through untouched', (_label, value) => {
		expect(errorSerializer(value)).toBe(value);
	});
});
