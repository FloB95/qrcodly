import { convertVCardObjToString } from '@shared/schemas';

describe('convertVCardObjToString — NOTE field newline handling', () => {
	it('encodes LF newlines as the RFC 6350 \\n escape sequence', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			note: 'Line1\nLine2\nLine3',
		});

		expect(result).toContain('NOTE:Line1\\nLine2\\nLine3');
		expect(result).not.toMatch(/NOTE:Line1\nLine2/);
	});

	it('normalises CRLF and bare CR to the same \\n escape', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			note: 'A\r\nB\rC',
		});

		expect(result).toContain('NOTE:A\\nB\\nC');
	});

	it('escapes existing backslashes so user-typed \\n stays literal', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			note: 'literal \\n stays literal',
		});

		expect(result).toContain('NOTE:literal \\\\n stays literal');
	});

	it('leaves single-line notes unchanged', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			note: 'Just one line',
		});

		expect(result).toContain('NOTE:Just one line');
	});
});

describe('convertVCardObjToString — split private/business addresses', () => {
	it('emits ADR;TYPE=HOME only when only the private address fields are set', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			streetPrivate: 'Privatstraße 1',
			cityPrivate: 'Privathausen',
			zipPrivate: '12345',
			statePrivate: 'BY',
			countryPrivate: 'Germany',
		});

		expect(result).toMatch(
			/ADR;TYPE=HOME:[^\r\n]*Privatstraße 1[^\r\n]*Privathausen[^\r\n]*BY[^\r\n]*12345[^\r\n]*Germany/,
		);
		expect(result).not.toContain('TYPE=WORK');
	});

	it('emits ADR;TYPE=WORK only when only the business address fields are set', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			streetBusiness: 'Bürostraße 10',
			cityBusiness: 'Geschäftsstadt',
			zipBusiness: '54321',
			stateBusiness: 'NRW',
			countryBusiness: 'Germany',
		});

		expect(result).toMatch(
			/ADR;TYPE=WORK:[^\r\n]*Bürostraße 10[^\r\n]*Geschäftsstadt[^\r\n]*NRW[^\r\n]*54321[^\r\n]*Germany/,
		);
		expect(result).not.toContain('TYPE=HOME');
	});

	it('emits both ADR lines with correct types when both addresses are set', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
			streetPrivate: 'Privatstraße 1',
			cityPrivate: 'Privathausen',
			streetBusiness: 'Bürostraße 10',
			cityBusiness: 'Geschäftsstadt',
		});

		expect(result).toMatch(/ADR;TYPE=HOME:[^\r\n]*Privatstraße 1[^\r\n]*Privathausen/);
		expect(result).toMatch(/ADR;TYPE=WORK:[^\r\n]*Bürostraße 10[^\r\n]*Geschäftsstadt/);
	});

	it('emits no ADR line when no address fields are set', () => {
		const result = convertVCardObjToString({
			firstName: 'Jane',
		});

		expect(result).not.toContain('ADR');
	});
});
