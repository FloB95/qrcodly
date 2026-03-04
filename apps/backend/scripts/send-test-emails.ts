/**
 * Sends all email templates with sample data to a given recipient.
 *
 * Usage:
 *   npx tsx scripts/send-test-emails.ts
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { dirname, join as pathJoin } from 'path';
import { fileURLToPath } from 'url';

const TO = 'me@fb-dev.de';
const FROM = '"QRcodly" <info@qrcodly.de>';

const dir = dirname(fileURLToPath(import.meta.url));
const templatesDir = pathJoin(dir, '../src/core/mailer/templates');

const transporter = nodemailer.createTransport({
	service: 'smtp',
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
	tls: { rejectUnauthorized: false },
});

const frontendUrl = process.env.FRONTEND_URL || 'https://www.qrcodly.de';
const logoUrl = `${frontendUrl}/email-logo.png`;
const year = new Date().getFullYear();

interface TemplateConfig {
	file: string;
	subject: string;
	vars: Record<string, unknown>;
}

const templates: TemplateConfig[] = [
	{
		file: 'subscription-cancel-initiated.handlebars',
		subject: '[Test] Subscription Cancellation Scheduled',
		vars: {
			firstName: 'Flo',
			periodEndDate: 'April 15, 2026',
			gracePeriodDays: 1,
			gracePeriodEndDate: 'April 16, 2026',
			subscribeUrl: `${frontendUrl}/plans`,
			year,
		},
	},
	{
		file: 'subscription-cancellation-reminder.handlebars',
		subject: '[Test] Subscription Ending Soon',
		vars: {
			firstName: 'Flo',
			periodEndDate: 'April 15, 2026',
			gracePeriodDays: 1,
			subscribeUrl: `${frontendUrl}/plans`,
			year,
		},
	},
	{
		file: 'subscription-past-due.handlebars',
		subject: '[Test] Payment Past Due',
		vars: {
			firstName: 'Flo',
			billingUrl: `${frontendUrl}/dashboard/settings/billing`,
			year,
		},
	},

	{
		file: 'subscription-domains-disabled.handlebars',
		subject: '[Test] Custom Domains Disabled',
		vars: {
			firstName: 'Flo',
			subscribeUrl: `${frontendUrl}/plans`,
			year,
		},
	},
	{
		file: 'subscription-reactivated.handlebars',
		subject: '[Test] Welcome Back!',
		vars: {
			firstName: 'Flo',
			dashboardUrl: `${frontendUrl}/dashboard/qr-codes`,
			year,
		},
	},
];

async function main() {
	console.log(`Sending ${templates.length} test emails to ${TO}...\n`);

	for (const tmpl of templates) {
		const markup = await readFile(pathJoin(templatesDir, tmpl.file), 'utf-8');
		const compiled = Handlebars.compile(markup);
		const html = compiled({ ...tmpl.vars, logoUrl });

		await transporter.sendMail({
			from: FROM,
			to: TO,
			subject: tmpl.subject,
			html,
		});

		console.log(`  Sent: ${tmpl.subject}`);
	}

	console.log('\nDone! All emails sent.');
	transporter.close();
}

main().catch((err) => {
	console.error('Failed:', err);
	process.exit(1);
});
