import { type Readable } from 'stream';

export interface Attachment {
	filename: string;
	content: string | Buffer | Readable | undefined;
}

/**
 * Interface for a mailer service.
 */
export interface IMailer {
	/**
	 * Sends an email.
	 * @param from The sender's email address.
	 * @param to The recipient email address or addresses.
	 * @param cc The CC email address or addresses.
	 * @param subject The subject of the email.
	 * @param text The plain text body of the email.
	 * @param html The HTML body of the email.
	 * @returns A promise that resolves with the email response.
	 */
	sendMail({
		from,
		to,
		cc,
		subject,
		text,
		html,
		attachments,
	}: {
		from?: string;
		to: string | string[];
		cc?: string | string[];
		subject: string;
		text?: string;
		html?: string;
		attachments?: Attachment[];
	}): Promise<unknown>;

	/**
	 * Disconnects the mailer service.
	 * @returns that resolves when the service is disconnected.
	 */
	disconnect(): void;
}
