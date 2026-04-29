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
