//@ts-nocheck
import 'dotenv/config';

import { z } from 'zod';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { S3 } from '@aws-sdk/client-s3';
import readline from 'readline';
import { createTable } from '../src/core/db/utils';
import { datetime, json, text, varchar } from 'drizzle-orm/mysql-core';

// Validate only the env vars this script needs
const scriptEnv = z
	.object({
		DB_HOST: z.string(),
		DB_USER: z.string(),
		DB_PASSWORD: z.string(),
		DB_NAME: z.string(),
		DB_PORT: z.string(),
		S3_ENDPOINT: z.string(),
		S3_REGION: z.string(),
		S3_UPLOAD_KEY: z.string(),
		S3_UPLOAD_SECRET: z.string(),
		S3_BUCKET_NAME: z.string(),
	})
	.parse(process.env);

// Inline table definitions to avoid importing the full schema (which pulls in env validation)
const qrCode = createTable('qr_code', {
	id: varchar('id', { length: 36 }).primaryKey(),
	config: json().notNull(),
	previewImage: text(),
	createdBy: varchar({ length: 255 }),
	createdAt: datetime().notNull(),
});

const configTemplate = createTable('qr_code_config_template', {
	id: varchar('id', { length: 36 }).primaryKey(),
	config: json().notNull(),
	previewImage: text(),
	createdBy: varchar({ length: 255 }),
	createdAt: datetime().notNull(),
});

// S3 prefixes that contain images
const S3_PREFIXES = [
	'qr-codes/images/previews/',
	'qr-codes/images/uploads/',
	'config-templates/images/previews/',
	'config-templates/images/uploads/',
];

interface S3Object {
	key: string;
	size: number;
	lastModified: Date | undefined;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function confirm(question: string): Promise<boolean> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
		});
	});
}

async function main() {
	const shouldDelete = process.argv.includes('--delete');

	// 1. Connect to database
	console.log('Connecting to database...');
	const poolConnection = mysql.createPool({
		host: scriptEnv.DB_HOST,
		user: scriptEnv.DB_USER,
		password: scriptEnv.DB_PASSWORD,
		database: scriptEnv.DB_NAME,
		port: Number(scriptEnv.DB_PORT),
		connectionLimit: 1,
	});

	const db = drizzle(poolConnection, { mode: 'default', casing: 'snake_case' });

	// 2. Collect all referenced S3 keys from the database
	console.log('Querying database for referenced images...');
	const referencedKeys = new Set<string>();

	// QR codes: previewImage + config.image
	const qrCodes = await db
		.select({
			previewImage: qrCode.previewImage,
			config: qrCode.config,
		})
		.from(qrCode);

	for (const row of qrCodes) {
		if (row.previewImage) {
			referencedKeys.add(row.previewImage);
		}
		if (row.config && typeof row.config === 'object') {
			const image = (row.config as Record<string, unknown>).image;
			if (typeof image === 'string' && image.length > 0) {
				referencedKeys.add(image);
			}
		}
	}

	// Config templates: previewImage + config.image
	const templates = await db
		.select({
			previewImage: configTemplate.previewImage,
			config: configTemplate.config,
		})
		.from(configTemplate);

	for (const row of templates) {
		if (row.previewImage) {
			referencedKeys.add(row.previewImage);
		}
		if (row.config && typeof row.config === 'object') {
			const image = (row.config as Record<string, unknown>).image;
			if (typeof image === 'string' && image.length > 0) {
				referencedKeys.add(image);
			}
		}
	}

	console.log(`Found ${referencedKeys.size} referenced image keys in the database`);
	console.log(`  - QR codes: ${qrCodes.length} rows`);
	console.log(`  - Config templates: ${templates.length} rows`);

	// 3. Create S3 client and list all objects under image prefixes
	console.log('\nConnecting to S3...');
	const s3 = new S3({
		endpoint: scriptEnv.S3_ENDPOINT,
		region: scriptEnv.S3_REGION,
		credentials: {
			accessKeyId: scriptEnv.S3_UPLOAD_KEY,
			secretAccessKey: scriptEnv.S3_UPLOAD_SECRET,
		},
		forcePathStyle: true,
	});

	const allS3Objects: S3Object[] = [];

	for (const prefix of S3_PREFIXES) {
		let continuationToken: string | undefined;
		do {
			const response = await s3.listObjectsV2({
				Bucket: scriptEnv.S3_BUCKET_NAME,
				Prefix: prefix,
				ContinuationToken: continuationToken,
			});

			if (response.Contents) {
				for (const obj of response.Contents) {
					if (obj.Key) {
						allS3Objects.push({
							key: obj.Key,
							size: obj.Size ?? 0,
							lastModified: obj.LastModified,
						});
					}
				}
			}

			continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
		} while (continuationToken);
	}

	console.log(`Found ${allS3Objects.length} total objects in S3 across image prefixes`);

	// 4. Find orphaned objects (in S3 but not referenced in DB)
	const orphaned = allS3Objects.filter((obj) => !referencedKeys.has(obj.key));

	if (orphaned.length === 0) {
		console.log('\nNo orphaned images found. Everything is clean!');
		await poolConnection.end();
		return;
	}

	// 5. Group by prefix and print report
	console.log('\n' + '='.repeat(60));
	console.log('ORPHANED S3 IMAGES REPORT');
	console.log('='.repeat(60));

	const groupedByPrefix = new Map<string, S3Object[]>();
	for (const obj of orphaned) {
		const prefix = S3_PREFIXES.find((p) => obj.key.startsWith(p)) ?? 'unknown/';
		if (!groupedByPrefix.has(prefix)) {
			groupedByPrefix.set(prefix, []);
		}
		groupedByPrefix.get(prefix)!.push(obj);
	}

	let totalOrphanedSize = 0;

	for (const [prefix, objects] of groupedByPrefix) {
		const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);
		totalOrphanedSize += totalSize;

		console.log(`\n--- ${prefix} (${objects.length} files, ${formatBytes(totalSize)}) ---`);
		for (const obj of objects) {
			const date = obj.lastModified ? obj.lastModified.toISOString().slice(0, 10) : 'unknown';
			console.log(`  ${obj.key} (${formatBytes(obj.size)}, ${date})`);
		}
	}

	console.log(`\n--- SUMMARY ---`);
	console.log(`Total S3 objects:   ${allS3Objects.length}`);
	console.log(`Referenced in DB:   ${allS3Objects.length - orphaned.length}`);
	console.log(`Orphaned:           ${orphaned.length}`);
	console.log(`Orphaned size:      ${formatBytes(totalOrphanedSize)}`);

	// 6. Optionally delete orphaned files
	if (shouldDelete) {
		const confirmed = await confirm(
			`\nDelete ${orphaned.length} orphaned files (${formatBytes(totalOrphanedSize)})? [y/N] `,
		);

		if (!confirmed) {
			console.log('Aborted. No files were deleted.');
			await poolConnection.end();
			return;
		}

		console.log('\nDeleting orphaned files...');

		// Delete in batches of 1000 (S3 deleteObjects limit)
		const BATCH_SIZE = 1000;
		for (let i = 0; i < orphaned.length; i += BATCH_SIZE) {
			const batch = orphaned.slice(i, i + BATCH_SIZE);
			await s3.deleteObjects({
				Bucket: scriptEnv.S3_BUCKET_NAME,
				Delete: {
					Objects: batch.map((obj) => ({ Key: obj.key })),
				},
			});
			console.log(`  Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} files)`);
		}

		console.log(`\nDone! Deleted ${orphaned.length} orphaned files.`);
	} else {
		console.log('\nRun with --delete to remove orphaned files.');
	}

	await poolConnection.end();
}

main().catch((err) => {
	console.error('Script failed:', err);
	process.exit(1);
});
