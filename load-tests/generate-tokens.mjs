#!/usr/bin/env node
// =============================================================================
// Generate Clerk JWT tokens for k6 load tests
//
// Uses the Clerk REST API directly — no SDK dependency needed.
//
// Usage:
//   CLERK_SECRET_KEY=sk_test_... node load-tests/generate-tokens.mjs
//
// Output:
//   Prints comma-separated JWT tokens to stdout (ready for k6 -e CLERK_TOKENS=...)
// =============================================================================

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API = process.env.CLERK_API || 'https://api.clerk.com/v1';
const JWT_TEMPLATE = process.env.JWT_TEMPLATE;

if (!CLERK_SECRET_KEY) {
	console.error('Error: CLERK_SECRET_KEY env var is required');
	console.error('');
	console.error('Usage:');
	console.error('  CLERK_SECRET_KEY=sk_test_... node load-tests/generate-tokens.mjs');
	process.exit(1);
}

if (!JWT_TEMPLATE) {
	console.error('Error: JWT_TEMPLATE env var is required');
	process.exit(1);
}

// Staging load test users (set TEST_USER_IDS in .env)
const USER_IDS = process.env.TEST_USER_IDS
	? process.env.TEST_USER_IDS.split(',').map((id) => id.trim())
	: [];

if (USER_IDS.length === 0) {
	console.error('Error: TEST_USER_IDS env var is required');
	console.error('Set comma-separated Clerk user IDs in load-tests/.env');
	process.exit(1);
}

async function clerkPost(path, body) {
	const res = await fetch(`${CLERK_API}${path}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CLERK_SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Clerk API ${path} failed (${res.status}): ${text}`);
	}

	return res.json();
}

async function generateToken(userId) {
	try {
		// 1. Create a session for the user
		const session = await clerkPost('/sessions', { user_id: userId });

		// 2. Get a JWT from that session using the custom template
		const tokenRes = await clerkPost(`/sessions/${session.id}/tokens/${JWT_TEMPLATE}`, {});

		if (!tokenRes?.jwt) {
			throw new Error('No JWT in response');
		}

		return { userId, token: tokenRes.jwt, sessionId: session.id };
	} catch (error) {
		console.error(`  ✗ ${userId}: ${error.message}`);
		return null;
	}
}

async function main() {
	console.error(`Generating tokens for ${USER_IDS.length} users...`);
	console.error('');

	const results = await Promise.all(USER_IDS.map(generateToken));
	const successful = results.filter(Boolean);

	if (successful.length === 0) {
		console.error('');
		console.error('Error: No tokens could be generated.');
		console.error('Check that CLERK_SECRET_KEY matches your staging Clerk instance');
		console.error('and that the user IDs exist.');
		process.exit(1);
	}

	for (const { userId, sessionId } of successful) {
		console.error(`  ✓ ${userId} (session: ${sessionId})`);
	}

	console.error('');
	console.error(`Generated ${successful.length}/${USER_IDS.length} tokens`);

	// Print comma-separated tokens to stdout (for piping into k6)
	console.log(successful.map((r) => r.token).join(','));
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
