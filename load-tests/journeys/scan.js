// =============================================================================
// Public QR scans: GET /u/<code> on the frontend, which looks the link up in
// the backend, records the scan (Umami, integrations) and redirects.
// The backend rate-limits scans per scanner IP (200/min), and all of this
// comes from one IP — keep SCAN_RATE low (≤ 2/s) from a single machine.
// =============================================================================

import { sleep } from 'k6';
import { RUN_ID, SCAN_URL } from '../config.js';
import { scan } from '../lib/client.js';
import { pick } from '../data/random.js';
import { scanHeaders } from '../data/user-agents.js';

export function scanOnce(codes) {
	if (!codes || !codes.length) {
		sleep(1);
		return;
	}
	scan(`${SCAN_URL}/u/${pick(codes)}`, scanHeaders(RUN_ID));
}
