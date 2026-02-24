/**
 * Send test emails for all subscription email templates.
 *
 * Usage: cd apps/backend && npx tsx scripts/send-test-emails.ts [recipient@email.com]
 *
 * If no recipient is provided, defaults to SMTP_USER from .env.
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';

const SMTP_HOST = process.env.SMTP_HOST!;
const SMTP_PORT = Number(process.env.SMTP_PORT!);
const SMTP_USER = process.env.SMTP_USER!;
const SMTP_PASS = process.env.SMTP_PASS!;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.qrcodly.de';
const FROM = 'info@qrcodly.de';

const recipient = process.argv[2] || SMTP_USER;

const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	auth: { user: SMTP_USER, pass: SMTP_PASS },
	tls: { rejectUnauthorized: false },
});

const templatesDir = join(import.meta.dirname, '../src/core/mailer/templates');

async function renderTemplate(name: string, data: Record<string, unknown>): Promise<string> {
	const markup = await readFile(join(templatesDir, `${name}.handlebars`), 'utf-8');
	return Handlebars.compile(markup)(data);
}

const year = new Date().getFullYear();

const templates = [
	{
		name: 'subscription-canceled',
		subject: '[TEST] Your QRcodly Subscription Has Ended',
		data: {
			firstName: 'Test User',
			gracePeriodEndDate: 'Wednesday, February 25, 2026',
			subscribeUrl: `${FRONTEND_URL}/plans`,
			year,
		},
	},
	{
		name: 'subscription-reactivated',
		subject: '[TEST] Welcome Back! Your QRcodly Subscription is Active',
		data: {
			firstName: 'Test User',
			dashboardUrl: `${FRONTEND_URL}/dashboard/qr-codes`,
			year,
		},
	},
	{
		name: 'subscription-domains-disabled',
		subject: '[TEST] Your QRcodly Custom Domains Have Been Disabled',
		data: {
			firstName: 'Test User',
			subscribeUrl: `${FRONTEND_URL}/plans`,
			year,
		},
	},
	{
		name: 'subscription-past-due',
		subject: '[TEST] Action Required: Your QRcodly Payment is Past Due',
		data: {
			firstName: 'Test User',
			billingUrl: `${FRONTEND_URL}/dashboard/settings/billing`,
			year,
		},
	},
];

async function main() {
	console.log(`Sending ${templates.length} test emails to: ${recipient}\n`);

	for (const t of templates) {
		const html = await renderTemplate(t.name, t.data);
		await transporter.sendMail({ from: FROM, to: recipient, subject: t.subject, html });
		console.log(`  Sent: ${t.name}`);
	}

	console.log('\nDone!');
	transporter.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
