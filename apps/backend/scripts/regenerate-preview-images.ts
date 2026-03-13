//@ts-nocheck
import 'dotenv/config';

import { z } from 'zod';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { GetObjectOutput, S3 } from '@aws-sdk/client-s3';
import { createTable } from '../src/core/db/utils';
import { datetime, json, text, varchar } from 'drizzle-orm/mysql-core';
import { eq, isNull } from 'drizzle-orm';
import { convertQrCodeOptionsToLibraryOptions } from '@shared/schemas';
import { generateQrCodeStylingInstance } from '../src/modules/qr-code/lib/styled-qr-code';

const CONCURRENCY = 20;

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
	content: json().notNull(),
	qrCodeData: text(),
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

const QR_CODE_PREVIEW_IMAGE_FOLDER = 'qr-codes/images/previews';
const CONFIG_TEMPLATE_PREVIEW_IMAGE_FOLDER = 'config-templates/images/previews';

const extensionToMimeType: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	webp: 'image/webp',
};

async function getImageAsDataUrl(s3: S3, storagePath: string): Promise<string | undefined> {
	try {
		const response: GetObjectOutput = await s3.getObject({
			Bucket: scriptEnv.S3_BUCKET_NAME,
			Key: storagePath,
		});
		if (!response.Body) return undefined;

		const bytes = await response.Body.transformToByteArray();
		const buffer = Buffer.from(bytes);
		const ext = storagePath.split('.').pop()?.toLowerCase() ?? '';
		const mimeType = extensionToMimeType[ext] ?? 'application/octet-stream';
		return `data:${mimeType};base64,${buffer.toString('base64')}`;
	} catch {
		return undefined;
	}
}

function constructFilePath(folder: string, userId: string | undefined, fileName: string): string {
	return userId ? `${folder}/${userId}/${fileName}` : `${folder}/${fileName}`;
}

async function processInParallel<T>(
	items: T[],
	concurrency: number,
	label: string,
	fn: (item: T, index: number) => Promise<boolean>,
): Promise<{ success: number; fail: number }> {
	let success = 0;
	let fail = 0;
	let nextIndex = 0;
	const total = items.length;

	async function worker() {
		while (nextIndex < total) {
			const i = nextIndex++;
			try {
				const ok = await fn(items[i], i);
				if (ok) success++;
				else fail++;
			} catch {
				fail++;
			}
			if ((success + fail) % 500 === 0) {
				console.log(
					`  ${label}: ${success + fail}/${total} processed (${success} ok, ${fail} failed)`,
				);
			}
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
	await Promise.all(workers);

	return { success, fail };
}

async function main() {
	console.log('=== Regenerate Preview Images ===\n');

	const poolConnection = mysql.createPool({
		host: scriptEnv.DB_HOST,
		user: scriptEnv.DB_USER,
		password: scriptEnv.DB_PASSWORD,
		database: scriptEnv.DB_NAME,
		port: Number(scriptEnv.DB_PORT),
		connectionLimit: CONCURRENCY,
	});

	const db = drizzle(poolConnection, { mode: 'default', casing: 'snake_case' });

	const s3 = new S3({
		endpoint: scriptEnv.S3_ENDPOINT,
		region: scriptEnv.S3_REGION,
		credentials: {
			accessKeyId: scriptEnv.S3_UPLOAD_KEY,
			secretAccessKey: scriptEnv.S3_UPLOAD_SECRET,
		},
		forcePathStyle: true,
	});

	// 1. Fetch QR codes with missing preview images
	console.log('Fetching QR codes with missing preview images...');
	const qrCodes = await db
		.select({
			id: qrCode.id,
			createdBy: qrCode.createdBy,
			config: qrCode.config,
			qrCodeData: qrCode.qrCodeData,
		})
		.from(qrCode)
		.where(isNull(qrCode.previewImage));

	console.log(`Found ${qrCodes.length} QR codes to process`);

	// 2. Fetch config templates with missing preview images
	console.log('Fetching config templates with missing preview images...');
	const templates = await db
		.select({
			id: configTemplate.id,
			createdBy: configTemplate.createdBy,
			config: configTemplate.config,
		})
		.from(configTemplate)
		.where(isNull(configTemplate.previewImage));

	console.log(`Found ${templates.length} config templates to process\n`);

	// 3. Process QR codes in parallel
	console.log(`--- Processing QR codes (concurrency: ${CONCURRENCY}) ---`);
	const qrResult = await processInParallel(qrCodes, CONCURRENCY, 'QR codes', async (row) => {
		if (!row.qrCodeData) return false;

		const libraryOptions = convertQrCodeOptionsToLibraryOptions(row.config as any);

		if (libraryOptions.image) {
			libraryOptions.image = (await getImageAsDataUrl(s3, libraryOptions.image)) ?? undefined;
		}

		const instance = generateQrCodeStylingInstance({
			...libraryOptions,
			data: row.qrCodeData,
		});

		const svg = await instance.getRawData('svg');
		if (!svg) return false;

		const buffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());
		const fileName = `${row.id}.svg`;
		const filePath = constructFilePath(
			QR_CODE_PREVIEW_IMAGE_FOLDER,
			row.createdBy ?? undefined,
			fileName,
		);

		await s3.putObject({
			Bucket: scriptEnv.S3_BUCKET_NAME,
			Key: filePath,
			Body: buffer,
			ContentType: 'image/svg+xml',
		});

		await db.update(qrCode).set({ previewImage: filePath }).where(eq(qrCode.id, row.id));

		return true;
	});

	// 4. Process config templates in parallel
	console.log(`\n--- Processing config templates (concurrency: ${CONCURRENCY}) ---`);
	const templateResult = await processInParallel(
		templates,
		CONCURRENCY,
		'Templates',
		async (row) => {
			const libraryOptions = convertQrCodeOptionsToLibraryOptions(row.config as any);

			if (libraryOptions.image) {
				libraryOptions.image = (await getImageAsDataUrl(s3, libraryOptions.image)) ?? undefined;
			}

			const instance = generateQrCodeStylingInstance({
				...libraryOptions,
				data: 'https://www.qrcodly.de/',
			});

			const svg = await instance.getRawData('svg');
			if (!svg) return false;

			const buffer = Buffer.isBuffer(svg) ? svg : Buffer.from(await svg.arrayBuffer());
			const fileName = `${row.id}.svg`;
			const filePath = constructFilePath(
				CONFIG_TEMPLATE_PREVIEW_IMAGE_FOLDER,
				row.createdBy ?? undefined,
				fileName,
			);

			await s3.putObject({
				Bucket: scriptEnv.S3_BUCKET_NAME,
				Key: filePath,
				Body: buffer,
				ContentType: 'image/svg+xml',
			});

			await db
				.update(configTemplate)
				.set({ previewImage: filePath })
				.where(eq(configTemplate.id, row.id));

			return true;
		},
	);

	// 5. Summary
	console.log('\n' + '='.repeat(50));
	console.log('SUMMARY');
	console.log('='.repeat(50));
	console.log(
		`QR code previews:    ${qrResult.success} success, ${qrResult.fail} failed (of ${qrCodes.length})`,
	);
	console.log(
		`Template previews:   ${templateResult.success} success, ${templateResult.fail} failed (of ${templates.length})`,
	);
	console.log('='.repeat(50));

	await poolConnection.end();
	console.log('\nDone.');
}

main().catch((err) => {
	console.error('Script failed:', err);
	process.exit(1);
});
