declare global {
	namespace jest {
		interface Matchers<R> {
			toHaveStatusCode(expected: number): R;
		}
	}
}
export {};
