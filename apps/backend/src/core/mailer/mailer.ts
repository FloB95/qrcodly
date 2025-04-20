import nodemailer, { type Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import { inject, singleton } from 'tsyringe';
import { type Attachment, type IMailer } from '../interface/mailer.interface';
import { env } from '../config/env';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { DEFAULT_FROM_MAIL, IN_TEST } from '../config/constants';
import { Logger } from '../logging';
import { dirname, join as pathJoin } from 'path';
import { readFile } from 'fs/promises';
import { OnShutdown } from '../decorators/on-shutdown.decorator';
import { fileURLToPath } from 'url';
import { type Address } from 'nodemailer/lib/mailer';

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName = 'user-invited';

/**
 * Mailer class for sending emails using Nodemailer.
 */
@singleton()
export class Mailer implements IMailer {
	private transporter: Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;

	readonly templatesCache: Partial<Record<TemplateName, Template>> = {};

	constructor(@inject(Logger) private logger: Logger) {
		this.transporter = nodemailer.createTransport({
			service: 'smtp',
			host: env.SMTP_HOST,
			port: Number(env.SMTP_PORT),
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS,
			},
			tls: {
				rejectUnauthorized: false,
			},
		});
	}

	async sendMail({
		from,
		to,
		cc,
		subject,
		text,
		html,
		attachments,
	}: {
		from?: string;
		to: string | string[] | Address;
		cc?: string | string[];
		subject: string;
		text?: string;
		html?: string;
		attachments?: Attachment[];
	}): Promise<unknown> {
		// Skip sending emails in test environment
		if (IN_TEST) return;

		try {
			const info = await this.transporter.sendMail({
				from: from || DEFAULT_FROM_MAIL,
				to,
				cc,
				subject,
				text,
				html,
				attachments,
			});
			const recipients = Array.isArray(to)
				? to.join(', ')
				: typeof to === 'object'
					? JSON.stringify(to)
					: to;
			this.logger.debug(`Email with Subject: ${subject} sent to: ${recipients}`, info);
			return info;
		} catch (error) {
			this.logger.error(`Failed to send email`, {
				recipients: to,
				error: error as Error,
			});
			throw error;
		}
	}

	async getTemplate(templateName: TemplateName): Promise<Template> {
		let template = this.templatesCache[templateName];
		if (!template) {
			const fileExtension = 'handlebars';
			const dir =
				typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
			const templatePath = pathJoin(dir, `templates/${templateName}.${fileExtension}`);
			const markup = await readFile(templatePath, 'utf-8');
			template = Handlebars.compile(markup);
			this.templatesCache[templateName] = template;
		}
		return template;
	}

	disconnect() {
		this.transporter.close();
	}

	@OnShutdown()
	onShutdown() {
		this.disconnect();
	}
}
