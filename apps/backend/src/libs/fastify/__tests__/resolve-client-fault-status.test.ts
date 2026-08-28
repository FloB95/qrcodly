import { resolveClientFaultStatus } from '../helpers';

const withProps = <T extends object>(error: Error, props: T) => Object.assign(error, props);

describe('resolveClientFaultStatus', () => {
	describe('malformed request bodies (client fault)', () => {
		it.each([
			'Multipart: Boundary not found',
			'Unexpected end of multipart data',
			'Unexpected end of form',
			'Malformed part header',
		])('maps busboy error "%s" to 400', (message) => {
			expect(resolveClientFaultStatus(new Error(message))).toBe(400);
		});

		it('matches on prefix, since busboy appends detail to some messages', () => {
			expect(resolveClientFaultStatus(new Error('Multipart: Boundary not found in headers'))).toBe(
				400,
			);
		});

		it('maps a JSON SyntaxError to 400', () => {
			expect(resolveClientFaultStatus(new SyntaxError('Unexpected token } in JSON'))).toBe(400);
		});
	});

	describe('framework errors carrying their own status', () => {
		it.each([
			['FST_ERR_CTP_INVALID_MEDIA_TYPE', 415],
			['FST_ERR_CTP_BODY_TOO_LARGE', 413],
			['FST_ERR_CTP_EMPTY_JSON_BODY', 400],
			['FST_ERR_VALIDATION', 400],
		])('preserves the status of %s (%i)', (code, statusCode) => {
			const error = withProps(new Error('nope'), { code, statusCode });
			expect(resolveClientFaultStatus(error)).toBe(statusCode);
		});
	});

	describe('server faults', () => {
		it('returns null for a generic error', () => {
			expect(resolveClientFaultStatus(new Error('Database connection lost'))).toBeNull();
		});

		it('returns null for an error carrying a 5xx status', () => {
			const error = withProps(new Error('upstream exploded'), { statusCode: 502 });
			expect(resolveClientFaultStatus(error)).toBeNull();
		});

		it('returns null for a non-numeric statusCode', () => {
			const error = withProps(new Error('weird'), { statusCode: '400' });
			expect(resolveClientFaultStatus(error)).toBeNull();
		});

		it('does not match a message that merely contains a malformed-body phrase', () => {
			expect(resolveClientFaultStatus(new Error('Job failed: Unexpected end of form'))).toBeNull();
		});
	});
});
