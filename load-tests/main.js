// =============================================================================
// k6 load test — logged-in QRcodly users working in the dashboard, plus
// optional public QR scans. Start it through ./run.sh (it mints the tokens).
//
//   ./run.sh smoke | baseline | load | stress | spike | soak
// =============================================================================

import { buildOptions } from './config.js';
import { visit } from './journeys/visit.js';
import { scanOnce } from './journeys/scan.js';
import { preflight } from './lib/preflight.js';

export { handleSummary } from './lib/summary.js';

export const options = buildOptions();

export function setup() {
	return preflight();
}

export function users() {
	visit();
}

export function scans(data) {
	scanOnce(data.scanCodes);
}
