/**
 * Renders every email template with sample data.
 *
 * Usage:
 *   pnpm run script:preview-emails                    # write HTML files to ./tmp/email-preview
 *   pnpm run script:preview-emails -- --send          # actually send them via SMTP
 *   pnpm run script:preview-emails -- --send --only admin   # ... only matching subjects
 *
 * The write mode is the fast loop: no SMTP round-trip, and you can open the files side by side to
 * compare wording and layout.
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { mkdir, readFile, writeFile } from 'fs/promises';
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
		file: 'subscription-pro-features-disabled.handlebars',
		subject: '[Test] Pro Features Disabled',
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

	// --- Extra custom domains (paid add-on) ---
	{
		file: 'domain-addon-reduction-scheduled.handlebars',
		subject: '[Test] Extra domains — reduction scheduled (the warning)',
		vars: {
			firstName: 'Flo',
			effectiveDate: 'Wednesday, January 1, 2027',
			currentQuantity: 5,
			scheduledQuantity: 2,
			isCurrentSingular: false,
			isScheduledSingular: false,
			affectedDomains: ['links.example.com', 'go.example.org', 'qr.example.net'],
			hasAffectedDomains: true,
			domainsUrl: `${frontendUrl}/dashboard/settings/domains`,
			year,
		},
	},
	{
		// down to a single slot, so the singular wording is exercised too
		file: 'domain-addon-reduction-scheduled.handlebars',
		subject: '[Test] Extra domains — reduction scheduled (singular, nothing lost)',
		vars: {
			firstName: 'Flo',
			effectiveDate: 'Wednesday, January 1, 2027',
			currentQuantity: 2,
			scheduledQuantity: 1,
			isCurrentSingular: false,
			isScheduledSingular: true,
			affectedDomains: [],
			hasAffectedDomains: false,
			domainsUrl: `${frontendUrl}/dashboard/settings/domains`,
			year,
		},
	},
	{
		file: 'domain-addon-quantity-reduced.handlebars',
		subject: '[Test] Extra domains — reduction now in effect',
		vars: {
			firstName: 'Flo',
			quantity: 2,
			isSingular: false,
			affectedDomains: ['go.example.org', 'qr.example.net'],
			hasAffectedDomains: true,
			domainsUrl: `${frontendUrl}/dashboard/settings/domains`,
			year,
		},
	},
	{
		file: 'domain-addon-cancel-initiated.handlebars',
		subject: '[Test] Extra domains — cancellation scheduled',
		vars: {
			firstName: 'Flo',
			periodEndDate: 'Wednesday, January 1, 2027',
			gracePeriodEndDate: 'Thursday, January 2, 2027',
			affectedDomains: ['links.example.com', 'go.example.org'],
			hasAffectedDomains: true,
			domainsUrl: `${frontendUrl}/dashboard/settings/domains`,
			year,
		},
	},
	{
		file: 'domain-addon-features-disabled.handlebars',
		subject: '[Test] Extra domains — slots have lapsed',
		vars: {
			firstName: 'Flo',
			affectedDomains: ['links.example.com', 'go.example.org'],
			hasAffectedDomains: true,
			domainsUrl: `${frontendUrl}/dashboard/settings/domains`,
			year,
		},
	},

	// --- URL safety ---
	{
		// first offence: block notice that doubles as the warning
		file: 'url-safety-link-blocked.handlebars',
		subject: '[Test] Link blocked (first offence — includes the warning)',
		vars: {
			firstName: 'Flo',
			hosts: ['phishy-login.example.com'],
			threatTypes: 'phishing / social engineering',
			shortCodes: ['ab3xz'],
			isWarning: true,
			offenceCount: 1,
			maxWarnings: 3,
			dashboardUrl: `${frontendUrl}/dashboard/short-urls`,
			supportEmail: 'support@qrcodly.de',
			year,
		},
	},
	{
		// the realistic bad case: one compromised site flagging several of a customer's links at once
		file: 'url-safety-link-blocked.handlebars',
		subject: '[Test] Link blocked (several links, no warning box)',
		vars: {
			firstName: 'Flo',
			hosts: ['hacked-cms.example.com', 'another-host.example.org'],
			threatTypes: 'malware',
			shortCodes: ['ab3xz', 'qq11z', 'zz99y'],
			isWarning: false,
			offenceCount: 2,
			dashboardUrl: `${frontendUrl}/dashboard/short-urls`,
			supportEmail: 'support@qrcodly.de',
			year,
		},
	},
	{
		file: 'url-safety-account-banned.handlebars',
		subject: '[Test] Account suspended',
		vars: {
			firstName: 'Flo',
			hosts: ['phishy-login.example.com'],
			threatTypes: 'phishing / social engineering',
			shortCodes: ['ab3xz'],
			occurredAt: '01/08/2026, 00:15:22',
			supportEmail: 'support@qrcodly.de',
			year,
		},
	},
	{
		file: 'url-safety-admin-alert.handlebars',
		subject: '[Test] Admin alert — auto-ban',
		vars: {
			isAutoBan: true,
			isUrgent: true,
			userId: 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T',
			offenceCount: 2,
			source: 'update',
			hosts: ['phishy-login.example.com'],
			shortCodes: ['ab3xz'],
			threatTypes: 'phishing / social engineering',
			clerkUserUrl: 'https://dashboard.clerk.com/last-active?path=users/user_2fTG',
			occurredAt: '01/08/2026, 00:15:22',
			year,
		},
	},
	{
		file: 'url-safety-admin-alert.handlebars',
		subject: '[Test] Admin alert — ban FAILED, act by hand',
		vars: {
			isAutoBan: false,
			isBanFailed: true,
			isUrgent: true,
			userId: 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T',
			offenceCount: 2,
			source: 'update',
			hosts: ['phishy-login.example.com'],
			shortCodes: ['ab3xz'],
			threatTypes: 'phishing / social engineering',
			clerkUserUrl: 'https://dashboard.clerk.com/last-active?path=users/user_2fTG',
			occurredAt: '01/08/2026, 00:15:22',
			year,
		},
	},
	{
		file: 'url-safety-admin-alert.handlebars',
		subject: '[Test] Admin alert — repeat finding needs review',
		vars: {
			isAutoBan: false,
			isUrgent: false,
			userId: 'user_2fTGlAmh9a1UhD5JYOD70Z4Y31T',
			offenceCount: 2,
			source: 'recheck',
			hosts: ['hacked-cms.example.com'],
			shortCodes: ['qq11z'],
			threatTypes: 'malware',
			clerkUserUrl: 'https://dashboard.clerk.com/last-active?path=users/user_2fTG',
			occurredAt: '01/08/2026, 00:15:22',
			year,
		},
	},
];

const slugify = (subject: string) =>
	subject
		.replace(/^\[Test\]\s*/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

async function main() {
	const send = process.argv.includes('--send');
	const onlyIndex = process.argv.indexOf('--only');
	const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1]?.toLowerCase() : undefined;
	const selected = only
		? templates.filter((t) => t.subject.toLowerCase().includes(only) || t.file.includes(only))
		: templates;

	if (!selected.length) {
		console.error(`No template matches "${only}".`);
		process.exit(1);
	}

	const outDir = pathJoin(dir, '../tmp/email-preview');

	if (!send) {
		await mkdir(outDir, { recursive: true });
		console.log(`Writing ${selected.length} previews to ${outDir}\n`);
	} else {
		console.log(`Sending ${selected.length} test emails to ${TO}...\n`);
	}

	for (const [index, tmpl] of selected.entries()) {
		const markup = await readFile(pathJoin(templatesDir, tmpl.file), 'utf-8');
		const compiled = Handlebars.compile(markup);
		const html = compiled({ ...tmpl.vars, logoUrl });

		// an unresolved tag means the template expects a variable this sample does not provide
		const leftover = html.match(/\{\{[^}]+\}\}/g);
		if (leftover) {
			console.warn(`  ! ${tmpl.file}: unresolved ${leftover.join(', ')}`);
		}

		if (send) {
			const info = await transporter.sendMail({ from: FROM, to: TO, subject: tmpl.subject, html });
			console.log(`  Sent: ${tmpl.subject}`);
			// Ethereal captures mail instead of delivering it and hands back a viewer URL
			const preview = nodemailer.getTestMessageUrl(info);
			if (preview) console.log(`        ${preview}`);
		} else {
			const name = `${String(index + 1).padStart(2, '0')}-${slugify(tmpl.subject)}.html`;
			await writeFile(pathJoin(outDir, name), html, 'utf-8');
			console.log(`  ${name}`);
		}
	}

	if (send) {
		console.log('\nDone! All emails sent.');
	} else {
		console.log(`\nDone. Open them with:  open ${outDir}`);
	}
	transporter.close();
}

main().catch((err) => {
	console.error('Failed:', err);
	process.exit(1);
});
