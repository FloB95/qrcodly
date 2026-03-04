/**
 * Jest Global Setup
 *
 * This file runs ONCE before all test suites start.
 * It's used to set up resources that are expensive to create and can be shared.
 *
 * Note: This runs in a separate process, so we can't share state directly.
 * We use environment variables or files for communication.
 */

export default function globalSetup() {
	// Set test environment
	process.env.NODE_ENV = 'test';

	// Any one-time setup that needs to happen before tests
	// e.g., ensuring test database exists, seeding data, etc.
	console.log('\n🚀 Starting test suite...\n');
}
