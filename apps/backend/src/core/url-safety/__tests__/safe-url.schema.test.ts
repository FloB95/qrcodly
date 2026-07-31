import {
	CreateShortUrlDto,
	SafeHttpUrlSchema,
	UpdateShortUrlDto,
	safeHttpUrl,
} from '@shared/schemas';

// Lives in the backend suite because packages/shared has no test runner of its own.
describe('SafeHttpUrlSchema', () => {
	it.each([
		['javascript:alert(1)', 'javascript scheme'],
		['data:text/html,<script>alert(1)</script>', 'data scheme'],
		['mailto:someone@example.com', 'mailto scheme'],
		['ftp://example.com/file', 'ftp scheme'],
		['https://paypal.com@evil.com/login', 'credentials disguising the real host'],
		['https://user:pass@evil.com/', 'explicit user:password'],
		['not-a-url', 'garbage'],
		['', 'empty string'],
	])('rejects %s (%s)', (input) => {
		expect(SafeHttpUrlSchema.safeParse(input).success).toBe(false);
	});

	it.each([
		'https://example.com',
		'http://example.com/path?query=1#frag',
		'https://sub.example.co.uk/a/b',
	])('accepts %s', (input) => {
		expect(SafeHttpUrlSchema.safeParse(input).success).toBe(true);
	});

	it('enforces the length cap when one is given', () => {
		const long = `https://example.com/${'a'.repeat(1000)}`;
		expect(safeHttpUrl(1000).safeParse(long).success).toBe(false);
		expect(safeHttpUrl(1000).safeParse('https://example.com/short').success).toBe(true);
	});
});

describe('short URL DTOs reject unsafe destinations', () => {
	it('CreateShortUrlDto rejects credentials in the destination', () => {
		const result = CreateShortUrlDto.safeParse({
			destinationUrl: 'https://paypal.com@evil.com/login',
		});
		expect(result.success).toBe(false);
	});

	it('UpdateShortUrlDto rejects a non-http scheme', () => {
		expect(UpdateShortUrlDto.safeParse({ destinationUrl: 'javascript:alert(1)' }).success).toBe(
			false,
		);
	});

	it('still accepts a normal destination', () => {
		expect(CreateShortUrlDto.safeParse({ destinationUrl: 'https://example.com' }).success).toBe(
			true,
		);
	});
});
