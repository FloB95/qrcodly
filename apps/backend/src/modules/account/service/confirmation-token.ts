import { createHash, randomBytes } from 'crypto';
import { ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS } from '@/core/config/constants';

export const hashConfirmationToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex');

/** A fresh secret for the confirmation link. Only its hash is stored, the secret goes into the mail. */
export function createConfirmationToken(): { token: string; hash: string; expiresAt: Date } {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS * 60 * 60 * 1000);
	return { token, hash: hashConfirmationToken(token), expiresAt };
}
