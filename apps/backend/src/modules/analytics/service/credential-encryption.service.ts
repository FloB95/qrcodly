import { singleton } from 'tsyringe';
import crypto from 'node:crypto';
import { env } from '@/core/config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@singleton()
export class CredentialEncryptionService {
	private getKey(): Buffer {
		const key = env.ANALYTICS_ENCRYPTION_KEY;
		if (!key) {
			throw new Error('ANALYTICS_ENCRYPTION_KEY is not configured.');
		}
		return Buffer.from(key, 'hex');
	}

	encrypt(data: Record<string, unknown>): { encrypted: string; iv: string; tag: string } {
		const key = this.getKey();
		const iv = crypto.randomBytes(IV_LENGTH);
		const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

		const plaintext = JSON.stringify(data);
		let encrypted = cipher.update(plaintext, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		const tag = cipher.getAuthTag();

		return {
			encrypted,
			iv: iv.toString('hex'),
			tag: tag.toString('hex'),
		};
	}

	decrypt(encrypted: string, iv: string, tag: string): Record<string, unknown> {
		const key = this.getKey();
		const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
		decipher.setAuthTag(Buffer.from(tag, 'hex'));

		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return JSON.parse(decrypted) as Record<string, unknown>;
	}
}
