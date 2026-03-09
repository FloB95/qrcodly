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
	} catch (error) {
		console.error(`  Failed to download image from S3: ${storagePath}`, error);
		return undefined;
	}
}

function constructFilePath(folder: string, userId: string | undefined, fileName: string): string {
	return userId ? `${folder}/${userId}/${fileName}` : `${folder}/${fileName}`;
}

async function main() {
	console.log('=== Regenerate Preview Images ===\n');

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

	// 2. Create S3 client
	const s3 = new S3({
		endpoint: scriptEnv.S3_ENDPOINT,
		region: scriptEnv.S3_REGION,
		credentials: {
			accessKeyId: scriptEnv.S3_UPLOAD_KEY,
			secretAccessKey: scriptEnv.S3_UPLOAD_SECRET,
		},
		forcePathStyle: true,
	});

	// 3. Fetch all QR codes with previewImage IS NULL
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

	// 4. Fetch all config templates with previewImage IS NULL
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

	let qrSuccess = 0;
	let qrFail = 0;
	let templateSuccess = 0;
	let templateFail = 0;

	// 5. Process QR codes
	for (let i = 0; i < qrCodes.length; i++) {
		const row = qrCodes[i];
		const progress = `[${i + 1}/${qrCodes.length}]`;

		if (!row.qrCodeData) {
			console.log(`${progress} QR code ${row.id}: skipped (no qrCodeData)`);
			qrFail++;
			continue;
		}

		try {
			const libraryOptions = convertQrCodeOptionsToLibraryOptions(row.config as any);

			// If config has a custom image, download from S3 and convert to base64
			if (libraryOptions.image) {
				libraryOptions.image = (await getImageAsDataUrl(s3, libraryOptions.image)) ?? undefined;
			}

			const instance = generateQrCodeStylingInstance({
				...libraryOptions,
				data: row.qrCodeData,
			});

			const svg = await instance.getRawData('svg');
			if (!svg) {
				console.log(`${progress} QR code ${row.id}: failed (no SVG generated)`);
				qrFail++;
				continue;
			}

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

			console.log(`${progress} QR code ${row.id}: OK`);
			qrSuccess++;
		} catch (error) {
			console.error(`${progress} QR code ${row.id}: FAILED`, error);
			qrFail++;
		}
	}

	// 6. Process config templates
	for (let i = 0; i < templates.length; i++) {
		const row = templates[i];
		const progress = `[${i + 1}/${templates.length}]`;

		try {
			const libraryOptions = convertQrCodeOptionsToLibraryOptions(row.config as any);

			if (libraryOptions.image) {
				libraryOptions.image = (await getImageAsDataUrl(s3, libraryOptions.image)) ?? undefined;
			}

			const instance = generateQrCodeStylingInstance({
				...libraryOptions,
				data: 'https://www.qrcodly.de/',
			});

			const svg = await instance.getRawData('svg');
			if (!svg) {
				console.log(`${progress} Template ${row.id}: failed (no SVG generated)`);
				templateFail++;
				continue;
			}

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

			console.log(`${progress} Template ${row.id}: OK`);
			templateSuccess++;
		} catch (error) {
			console.error(`${progress} Template ${row.id}: FAILED`, error);
			templateFail++;
		}
	}

	// 7. Print summary
	console.log('\n' + '='.repeat(50));
	console.log('SUMMARY');
	console.log('='.repeat(50));
	console.log(`QR codes:         ${qrSuccess} success, ${qrFail} failed (of ${qrCodes.length})`);
	console.log(
		`Config templates: ${templateSuccess} success, ${templateFail} failed (of ${templates.length})`,
	);
	console.log('='.repeat(50));

	await poolConnection.end();
	console.log('\nDone.');
}

main().catch((err) => {
	console.error('Script failed:', err);
	process.exit(1);
});
