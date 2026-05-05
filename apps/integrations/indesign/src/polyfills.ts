// React 19's reconciler calls `performance.measure(name, { start, end })` —
// the User Timing Level 3 form. UXP only implements the legacy
// `(name, startMark, endMark)` form and tries to use the options object as a
// mark name, which throws "The mark [object Object] does not exist" on the
// first commit. Wrap measure() so the object form is a safe no-op.
const perf = (globalThis as { performance?: Performance }).performance;
if (perf && typeof perf.measure === 'function') {
	const original = perf.measure.bind(perf);
	perf.measure = function patchedMeasure(name: string, startOrOptions?: unknown, endMark?: string) {
		try {
			if (startOrOptions && typeof startOrOptions === 'object') {
				return undefined as unknown as PerformanceMeasure;
			}
			return original(name, startOrOptions as string | undefined, endMark);
		} catch {
			return undefined as unknown as PerformanceMeasure;
		}
	} as Performance['measure'];
}

export {};
