import { parseByteRange } from '../byte-range';

describe('parseByteRange', () => {
	it('sends the whole file without a usable header', () => {
		expect(parseByteRange(undefined, 100)).toBeNull();
		expect(parseByteRange('bytes=-', 100)).toBeNull();
		expect(parseByteRange('bytes=0-1,5-9', 100)).toBeNull();
		expect(parseByteRange('items=0-1', 100)).toBeNull();
		expect(parseByteRange('bytes=9-3', 100)).toBeNull();
	});

	it('reads open, closed and suffix ranges, capped at the end of the file', () => {
		expect(parseByteRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
		expect(parseByteRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
		expect(parseByteRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
		expect(parseByteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
		expect(parseByteRange('bytes=-500', 100)).toEqual({ start: 0, end: 99 });
	});

	it('refuses a range that starts beyond the end', () => {
		expect(parseByteRange('bytes=100-', 100)).toBe('unsatisfiable');
		expect(parseByteRange('bytes=-0', 100)).toBe('unsatisfiable');
	});

	it('sends the whole file when If-Range no longer matches', () => {
		expect(parseByteRange('bytes=0-9', 100, '"old"', '"new"')).toBeNull();
		expect(parseByteRange('bytes=0-9', 100, '"new"', '"new"')).toEqual({ start: 0, end: 9 });
	});
});
