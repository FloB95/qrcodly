// =============================================================================
// k6 Load Test Configuration
// =============================================================================

// --- Environment ---
export const BASE_URL = __ENV.BASE_URL || '';

// --- Clerk ---
export const CLERK_SECRET_KEY = __ENV.CLERK_SECRET_KEY || '';
export const CLERK_API = __ENV.CLERK_API || 'https://api.clerk.com/v1';
export const JWT_TEMPLATE = __ENV.JWT_TEMPLATE || '';
export const USER_IDS = __ENV.TEST_USER_IDS
	? __ENV.TEST_USER_IDS.split(',').map((id) => id.trim())
	: [];

// Clerk Bearer tokens for authenticated users
// Generate these from your Clerk dashboard or by logging in and extracting the JWT
// You can provide multiple tokens (comma-separated) to simulate different users
const tokenString = __ENV.CLERK_TOKENS || '';
export const CLERK_TOKENS = tokenString ? tokenString.split(',').map((t) => t.trim()) : [];

// --- Load Profiles ---
export const PROFILES = {
	// Quick smoke test - verify endpoints work
	smoke: {
		stages: [{ duration: '30s', target: 5 }],
	},

	// Light load - normal traffic
	light: {
		stages: [
			{ duration: '30s', target: 50 },
			{ duration: '2m', target: 50 },
			{ duration: '30s', target: 0 },
		],
	},

	// Medium load - busy hours
	medium: {
		stages: [
			{ duration: '1m', target: 100 },
			{ duration: '3m', target: 250 },
			{ duration: '1m', target: 0 },
		],
	},

	// Heavy load - stress test
	heavy: {
		stages: [
			{ duration: '20s', target: 100 },
			{ duration: '1m', target: 500 },
			{ duration: '2m', target: 1000 },
			{ duration: '1m', target: 1000 },
			{ duration: '20s', target: 0 },
		],
	},

	// Spike test - sudden traffic surge
	spike: {
		stages: [
			{ duration: '30s', target: 50 },
			{ duration: '10s', target: 1000 },
			{ duration: '1m', target: 1500 },
			{ duration: '10s', target: 50 },
			{ duration: '1m', target: 50 },
			{ duration: '30s', target: 0 },
		],
	},
};

// --- Thresholds ---
export const THRESHOLDS = {
	http_req_duration: [
		'p(95)<2000', // 95% of requests under 2s
		'p(99)<5000', // 99% under 5s
	],
	http_req_failed: [
		'rate<0.05', // Less than 5% errors
	],
	'http_req_duration{type:api_list}': ['p(95)<1500'],
	'http_req_duration{type:api_create}': ['p(95)<3000'],
	'http_req_duration{type:api_update}': ['p(95)<2000'],
	'http_req_duration{type:api_delete}': ['p(95)<1000'],
};
