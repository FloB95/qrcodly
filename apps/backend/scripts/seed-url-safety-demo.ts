/**
 * Puts the local database into a realistic URL-safety state so the dashboard, the emails' subject
 * matter and the public pages can be looked at without waiting for Google to flag anything.
 *
 * Usage:
 *   pnpm run script:seed-safety-demo -- --user user_123   # seed for a specific Clerk user
 *   pnpm run script:seed-safety-demo                      # ... or the user who owns the most links
 *   pnpm run script:seed-safety-demo -- --reset --user u  # remove everything this script created
 *
 * It creates its own links rather than repurposing existing ones — hijacking a real link would be
 * confusing and the reset could not tell what to restore. Every row it writes is marked with
 * DEMO_NAME_PREFIX, and --reset deletes exactly those.
 *
 * Local only: refuses to run against a database that is not on localhost.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

const DEMO_NAME_PREFIX = '[safety-demo]';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const userArgIndex = args.indexOf('--user');
const explicitUser = userArgIndex >= 0 ? args[userArgIndex + 1] : undefined;

const host = process.env.DB_HOST ?? 'localhost';
if (!['localhost', '127.0.0.1', '::1', 'db', 'qrcodly-db'].includes(host)) {
	console.error(
		`Refusing to run: DB_HOST is "${host}", which does not look like a local database.`,
	);
	process.exit(1);
}

const connection = await mysql.createConnection({
	host,
	port: Number(process.env.DB_PORT ?? 3306),
	user: process.env.DB_USER ?? 'root',
	password: process.env.DB_PASSWORD ?? 'root',
	database: process.env.DB_NAME ?? 'qrcodly',
});

type Param = string | number | null | Date;

const query = async <T>(sql: string, params: Param[] = []): Promise<T[]> => {
	const [rows] = await connection.execute(sql, params);
	return rows as T[];
};

const hostOf = (url: string) => new URL(url).hostname;

async function freeShortCode(): Promise<string> {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	for (;;) {
		const code = Array.from(
			{ length: 5 },
			() => alphabet[Math.floor(Math.random() * alphabet.length)],
		).join('');
		const taken = await query(`SELECT 1 FROM short_url WHERE short_code = ? LIMIT 1`, [code]);
		if (!taken.length) return code;
	}
}

async function pickUser(): Promise<string> {
	if (explicitUser) return explicitUser;

	const rows = await query<{ created_by: string }>(
		`SELECT created_by FROM short_url WHERE deleted_at IS NULL
		 GROUP BY created_by ORDER BY COUNT(*) DESC LIMIT 1`,
	);
	if (!rows.length) {
		console.error('No short URLs at all — pass --user <clerkUserId> explicitly.');
		process.exit(1);
	}
	return rows[0].created_by;
}

async function doReset(userId: string) {
	const demo = await query<{ id: string }>(
		`SELECT id FROM short_url WHERE created_by = ? AND name LIKE ?`,
		[userId, `${DEMO_NAME_PREFIX}%`],
	);

	for (const link of demo) {
		await query(`DELETE FROM url_safety_incident WHERE short_url_id = ?`, [link.id]);
		await query(`DELETE FROM short_url WHERE id = ?`, [link.id]);
	}

	await query(`DELETE FROM url_safety_incident WHERE user_id = ?`, [userId]);
	await query(`DELETE FROM user_safety_standing WHERE user_id = ?`, [userId]);

	console.log(`Removed ${demo.length} demo link(s), all incidents and the offence standing.`);
	console.log('A ban lives in Clerk, not here. Lift one with:');
	console.log(`  pnpm run cli url-safety:clear-standing -u ${userId}`);
}

interface DemoLink {
	/** Goes into short_url.name, which is varchar(50) — keep it short. */
	name: string;
	/** Longer description, console output only. */
	label: string;
	destination: string;
	isActive: boolean;
	safetyStatus: 'unchecked' | 'clean' | 'blocked';
	threatTypes?: string;
	pending?: boolean;
	incident?: { action: 'blocked' | 'shadow'; acknowledged: boolean };
}

const DEMO_LINKS: DemoLink[] = [
	{
		name: 'blocked · phishing',
		label: 'blocked · phishing · banner visible',
		destination: 'https://secure-login-verify.example.com/account',
		isActive: false,
		safetyStatus: 'blocked',
		threatTypes: 'SOCIAL_ENGINEERING',
		incident: { action: 'blocked', acknowledged: false },
	},
	{
		name: 'blocked · malware',
		label: 'blocked · malware · incident already dismissed',
		destination: 'https://downloads.hacked-cms.example.org/setup',
		isActive: false,
		safetyStatus: 'blocked',
		threatTypes: 'MALWARE',
		incident: { action: 'blocked', acknowledged: true },
	},
	{
		name: 'unwanted software',
		label: 'unwanted software · observed, deliberately NOT blocked',
		destination: 'https://free-toolbar.example.net/download',
		isActive: true,
		safetyStatus: 'clean',
		threatTypes: 'UNWANTED_SOFTWARE',
		incident: { action: 'shadow', acknowledged: false },
	},
	{
		name: 'awaiting confirmation',
		label: 'flagged once · awaiting the confirming lookup',
		destination: 'https://maybe-bad.example.com/promo',
		isActive: true,
		safetyStatus: 'clean',
		pending: true,
	},
	{
		name: 'disabled by owner',
		label: 'disabled by the owner · must NOT look blocked',
		destination: 'https://example.com/seasonal-campaign',
		isActive: false,
		safetyStatus: 'clean',
	},
	{
		name: 'healthy control',
		label: 'healthy · control',
		destination: 'https://example.com/always-fine',
		isActive: true,
		safetyStatus: 'clean',
	},
];

async function seed(userId: string) {
	await doReset(userId);
	console.log('');

	const created: { code: string; label: string }[] = [];

	for (const link of DEMO_LINKS) {
		const id = randomUUID();
		const code = await freeShortCode();

		await query(
			`INSERT INTO short_url
			   (id, short_code, name, destination_url, qr_code_id, custom_domain_id, is_active,
			    created_by, created_at, safety_status, safety_blocked_at, safety_threat_types,
			    last_safety_check_at, next_safety_check_at, safety_check_failures, safety_pending_since)
			 VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, NOW(), ?, ${link.safetyStatus === 'blocked' ? 'NOW()' : 'NULL'}, ?,
			         NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), 0, ${link.pending ? 'NOW()' : 'NULL'})`,
			[
				id,
				code,
				`${DEMO_NAME_PREFIX} ${link.name}`,
				link.destination,
				link.isActive ? 1 : 0,
				userId,
				link.safetyStatus,
				link.threatTypes ?? null,
			],
		);

		if (link.incident) {
			await query(
				`INSERT INTO url_safety_incident
				   (id, user_id, short_url_id, destination_host, threat_types, source, action,
				    counted_as_offence, acknowledged_at, created_at)
				 VALUES (?, ?, ?, ?, ?, 'recheck', ?, ?, ${link.incident.acknowledged ? 'NOW()' : 'NULL'}, NOW())`,
				[
					randomUUID(),
					userId,
					id,
					hostOf(link.destination),
					link.threatTypes ?? null,
					link.incident.action,
					link.incident.action === 'blocked' ? 1 : 0,
				],
			);
		}

		created.push({ code, label: link.label });
	}

	// a create-time refusal: no link was ever written, so the incident has no short URL attached
	await query(
		`INSERT INTO url_safety_incident
		   (id, user_id, short_url_id, destination_host, threat_types, source, action,
		    counted_as_offence, acknowledged_at, created_at)
		 VALUES (?, ?, NULL, 'blocked-at-creation.example.com', 'SOCIAL_ENGINEERING', 'create',
		         'rejected', 1, NULL, NOW())`,
		[randomUUID(), userId],
	);

	// warned but not banned — this drives the extra line in the banner
	await query(
		`INSERT INTO user_safety_standing
		   (user_id, offence_count, first_offence_at, last_offence_at, warned_at, warning_email_sent_at, created_at)
		 VALUES (?, 1, NOW(), NOW(), NOW(), NOW(), NOW())
		 ON DUPLICATE KEY UPDATE offence_count = 1, last_offence_at = NOW(), warned_at = NOW(), banned_at = NULL`,
		[userId],
	);

	console.log(`Seeded ${created.length} demo links for ${userId}:\n`);
	for (const c of created) console.log(`  /u/${c.code}   ${c.label}`);

	const blockedCode = created[0].code;
	const disabledCode = created[4].code;

	console.log('\nWhat to check:');
	console.log('  Dashboard  http://localhost:3000/dashboard/short-urls');
	console.log('    · red banner: 2 open findings (1 blocked link + 1 create-time refusal)');
	console.log('      plus the "one more and we suspend the account" line');
	console.log('    · two rows with a red "Blocked" badge, their toggle disabled');
	console.log('    · the owner-disabled row still shows the normal grey badge and toggles fine');
	console.log('    · status filter "Blocked" returns exactly the two blocked links');
	console.log('    · "Got it" dismisses the banner; the badges stay');
	console.log(`\n  Public     http://localhost:3000/u/${blockedCode}   → "Link blocked" page`);
	console.log(`             http://localhost:3000/u/${disabledCode}   → "QR code Disabled" page`);
	console.log('\nUndo:  pnpm run script:seed-safety-demo -- --reset --user ' + userId);
}

const userId = await pickUser();
if (reset) await doReset(userId);
else await seed(userId);

await connection.end();
