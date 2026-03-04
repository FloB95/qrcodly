/**
 * Jest Global Teardown
 *
 * This file runs ONCE after all test suites complete.
 * It's used to clean up resources created in global setup.
 *
 * Note: This runs in a separate process from the tests.
 */

export default function globalTeardown() {
	console.log('\n✅ All tests completed.\n');
}
