import 'dotenv/config';

import { z } from 'zod';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { inArray } from 'drizzle-orm';
import { createTable } from '../core/db/utils';
import { boolean, datetime, text, varchar } from 'drizzle-orm/mysql-core';

// Validate only the env vars this script needs
const scriptEnv = z
	.object({
		DB_HOST: z.string(),
		DB_USER: z.string(),
		DB_PASSWORD: z.string(),
		DB_NAME: z.string(),
		DB_PORT: z.string(),
		UMAMI_HOST: z.string().url(),
		UMAMI_WEBSITE: z.string(),
		UMAMI_USERNAME: z.string(),
		UMAMI_PASSWORD: z.string(),
	})
	.parse(process.env);

// Inline table definition to avoid importing the full schema (which pulls in env validation)
const shortUrl = createTable('short_url', {
	id: varchar('id', { length: 36 }).primaryKey(),
	shortCode: varchar({ length: 5 }).notNull().unique(),
	destinationUrl: text(),
	qrCodeId: varchar({ length: 36 }),
	isActive: boolean().notNull(),
	createdBy: varchar({ length: 255 }).notNull(),
	createdAt: datetime().notNull(),
	updatedAt: datetime(),
	deletedAt: datetime(),
});

interface UmamiMetric {
	x: string;
	y: number;
}

async function main() {
	// 1. Authenticate with Umami
	console.log('Authenticating with Umami...');
	const authRes = await fetch(`${scriptEnv.UMAMI_HOST}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			username: scriptEnv.UMAMI_USERNAME,
			password: scriptEnv.UMAMI_PASSWORD,
		}),
	});

	if (!authRes.ok) {
		throw new Error(`Umami auth failed: ${authRes.status} ${await authRes.text()}`);
	}

	const { token } = (await authRes.json()) as { token: string };

	// 2. Fetch URL metrics from Umami
	console.log('Fetching URL metrics from Umami...');
	const startAt = new Date('2023-01-01').getTime();
	const endAt = Date.now();
	const params = new URLSearchParams({
		type: 'path',
		startAt: String(startAt),
		endAt: String(endAt),
	});
	const metricsUrl = `${scriptEnv.UMAMI_HOST}/api/websites/${scriptEnv.UMAMI_WEBSITE}/metrics?${params}`;

	const metricsRes = await fetch(metricsUrl, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!metricsRes.ok) {
		throw new Error(`Umami metrics failed: ${metricsRes.status} ${await metricsRes.text()}`);
	}

	const metrics = (await metricsRes.json()) as UmamiMetric[];

	// 3. Filter for /u/{code} paths and extract short codes
	const shortUrlPattern = /^\/u\/([^/]+)$/;
	const umamiEntries = new Map<string, number>();

	for (const metric of metrics) {
		const match = metric.x.match(shortUrlPattern);
		if (match) {
			umamiEntries.set(match[1], metric.y);
		}
	}

	console.log(`Found ${umamiEntries.size} unique short codes in Umami analytics\n`);

	if (umamiEntries.size === 0) {
		console.log('No /u/* paths found in Umami. Nothing to check.');
		return;
	}

	// 4. Query database for these short codes
	const poolConnection = mysql.createPool({
		host: scriptEnv.DB_HOST,
		user: scriptEnv.DB_USER,
		password: scriptEnv.DB_PASSWORD,
		database: scriptEnv.DB_NAME,
		port: Number(scriptEnv.DB_PORT),
		connectionLimit: 1,
	});

	const db = drizzle(poolConnection, { mode: 'default', casing: 'snake_case' });

	const codes = [...umamiEntries.keys()];
	const dbRows = await db
		.select({
			shortCode: shortUrl.shortCode,
			deletedAt: shortUrl.deletedAt,
			isActive: shortUrl.isActive,
		})
		.from(shortUrl)
		.where(inArray(shortUrl.shortCode, codes));

	const dbMap = new Map(dbRows.map((row) => [row.shortCode, row]));

	// 5. Categorize results
	const notInDb: { code: string; views: number }[] = [];
	const softDeleted: { code: string; views: number; deletedAt: Date }[] = [];
	const inactive: { code: string; views: number }[] = [];
	const active: { code: string; views: number }[] = [];

	for (const [code, views] of umamiEntries) {
		const row = dbMap.get(code);
		if (!row) {
			notInDb.push({ code, views });
		} else if (row.deletedAt) {
			softDeleted.push({ code, views, deletedAt: row.deletedAt });
		} else if (!row.isActive) {
			inactive.push({ code, views });
		} else {
			active.push({ code, views });
		}
	}

	// Sort each category by views descending
	notInDb.sort((a, b) => b.views - a.views);
	softDeleted.sort((a, b) => b.views - a.views);
	inactive.sort((a, b) => b.views - a.views);

	// 6. Print report
	console.log('='.repeat(60));
	console.log('ORPHANED SHORT URL REPORT');
	console.log('='.repeat(60));

	if (notInDb.length > 0) {
		console.log(`\n--- NOT IN DATABASE (${notInDb.length}) ---`);
		console.table(notInDb.map((e) => ({ 'Short Code': e.code, 'Umami Views': e.views })));
	}

	if (softDeleted.length > 0) {
		console.log(`\n--- SOFT-DELETED (${softDeleted.length}) ---`);
		console.table(
			softDeleted.map((e) => ({
				'Short Code': e.code,
				'Umami Views': e.views,
				'Deleted At': e.deletedAt.toISOString(),
			})),
		);
	}

	if (inactive.length > 0) {
		console.log(`\n--- INACTIVE (${inactive.length}) ---`);
		console.table(inactive.map((e) => ({ 'Short Code': e.code, 'Umami Views': e.views })));
	}

	console.log(`\n--- SUMMARY ---`);
	console.log(`Active:       ${active.length}`);
	console.log(`Inactive:     ${inactive.length}`);
	console.log(`Soft-deleted: ${softDeleted.length}`);
	console.log(`Not in DB:    ${notInDb.length}`);
	console.log(`Total in Umami: ${umamiEntries.size}`);

	await poolConnection.end();
}

main().catch((err) => {
	console.error('Script failed:', err);
	process.exit(1);
});
