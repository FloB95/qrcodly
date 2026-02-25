/**
 * SMTP Connection Test Script
 *
 * Tests SMTP connectivity and optionally sends a test email.
 *
 * Usage:
 *   cd apps/backend
 *   pnpm tsx scripts/test-smtp.ts              # verify connection only
 *   pnpm tsx scripts/test-smtp.ts send <email>  # send a test email
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
	console.error('Missing SMTP environment variables. Check your .env file.');
	process.exit(1);
}

const config = {
	host: SMTP_HOST,
	port: Number(SMTP_PORT),
	auth: { user: SMTP_USER, pass: SMTP_PASS },
	tls: { rejectUnauthorized: false },
};

console.log('SMTP config:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  User: ${config.auth.user}`);
console.log(`  TLS:  rejectUnauthorized = false`);
console.log();

const transporter = nodemailer.createTransport(config);

async function main() {
	// Step 1: Verify connection
	console.log('Verifying SMTP connection...');
	try {
		await transporter.verify();
		console.log('SMTP connection successful!\n');
	} catch (err) {
		console.error('SMTP connection FAILED:\n');
		console.error(err);
		process.exit(1);
	}

	// Step 2: Optionally send a test email
	const [, , action, recipient] = process.argv;
	if (action === 'send') {
		const to = recipient || SMTP_USER;
		console.log(`Sending test email to ${to}...`);
		try {
			const info = await transporter.sendMail({
				from: `"QRcodly Test" <${SMTP_USER}>`,
				to,
				subject: 'QRcodly SMTP Test',
				text: 'If you can read this, SMTP delivery is working.',
				html: '<p>If you can read this, <strong>SMTP delivery is working</strong>.</p>',
			});
			console.log('Email sent! Message ID:', info.messageId);
			console.log('Response:', info.response);
		} catch (err) {
			console.error('Failed to send email:\n');
			console.error(err);
			process.exit(1);
		}
	}

	transporter.close();
}

main();
