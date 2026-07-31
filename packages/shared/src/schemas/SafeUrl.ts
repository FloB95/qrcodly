import { z } from 'zod';

const CREDENTIALS_MESSAGE = 'URL must not contain credentials (user:password@host)';

/**
 * `z.httpUrl()` accepts `https://paypal.com@evil.com/login` — the host is `evil.com`, but the
 * string reads as `paypal.com` wherever we display it. Refuse the userinfo component outright.
 */
const hasNoCredentials = (value: string): boolean => {
	try {
		const { username, password } = new URL(value);
		return username === '' && password === '';
	} catch {
		return false;
	}
};

/** http(s)-only URL without embedded credentials. Use at every user-input boundary. */
export const SafeHttpUrlSchema = z.httpUrl().refine(hasNoCredentials, CREDENTIALS_MESSAGE);

/** Same as {@link SafeHttpUrlSchema} with a length cap, for the fields that have one. */
export const safeHttpUrl = (maxLength: number) =>
	z.httpUrl().max(maxLength).refine(hasNoCredentials, CREDENTIALS_MESSAGE);
