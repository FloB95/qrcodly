/**
 * Emits a metric and swallows anything it throws.
 *
 * Telemetry is never worth an incident. The instrumentation added around the database, cache,
 * object storage and every outbound API call sits directly in the request path, so a broken
 * exporter, an SDK bug or an exhausted cardinality limit must not be able to fail the operation
 * that happened to be measured.
 *
 * Note this only guards the *recording* side. Export to Axiom already happens out-of-band in the
 * PeriodicExportingMetricReader, where failures are contained by the SDK and never surface here.
 */
export function safely(emit: () => void): void {
	try {
		emit();
	} catch {
		// Deliberately ignored — see above.
	}
}
