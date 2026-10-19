// =============================================================================
// One visit of a logged-in user: open the dashboard (full page load, empty
// query cache), do a few things with pauses in between, then wander off.
// =============================================================================

import { page } from '../lib/client.js';
import { Q, loadViews, resetCache, sidebar } from '../lib/queries.js';
import { currentUser } from '../lib/session.js';
import { action, think } from '../lib/util.js';
import { randomInt, weighted } from '../data/random.js';
import { browse, create, duplicate, edit, remove } from './qr-codes.js';
import { shortUrls } from './short-urls.js';
import { organize } from './organize.js';

// Share of actions per visit. Reading dominates, as on any dashboard.
const JOURNEYS = [
	[browse, 34],
	[create, 20],
	[edit, 14],
	[shortUrls, 14],
	[organize, 10],
	[remove, 6],
	[duplicate, 2],
];

function openDashboard(user) {
	resetCache();
	action('open dashboard', () => {
		page(user, '/dashboard/qr-codes', '/dashboard/qr-codes', { document: true });
		const [list] = sidebar(user, [Q.qrCodes(1)]);
		loadViews(user, list && list.data);
	});
}

export function visit() {
	const user = currentUser();
	openDashboard(user);

	const actions = randomInt(2, 5);
	for (let i = 0; i < actions; i++) {
		think(3, 10);
		weighted(JOURNEYS)(user);
	}
	think(15, 45);
}
