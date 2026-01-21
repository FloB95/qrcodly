import { inject, singleton } from 'tsyringe';
import { promises as dns } from 'dns';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';

/**
 * Result of DNS verification for a custom domain.
 */
export interface IDnsVerificationResult {
	ownershipTxtVerified: boolean;
	cnameVerified: boolean;
}

/**
 * Service for verifying DNS records for custom domain ownership.
 *
 * This service performs DNS lookups to verify:
 * 1. Ownership TXT record (_qrcodly-verify.{domain})
 * 2. CNAME record pointing to the correct target
 */
@singleton()
export class DnsVerificationService {
	private readonly logger: Logger;
	private readonly isTestEnvironment: boolean;
	private readonly cnameTarget: string;

	constructor(@inject(Logger) logger: Logger) {
		this.logger = logger;
		this.isTestEnvironment = process.env.NODE_ENV === 'test';
		this.cnameTarget = env.CUSTOM_DOMAIN_CNAME_TARGET;
	}

	/**
	 * Verifies that the ownership TXT record exists with the expected value.
	 *
	 * @param domain - The domain to verify (e.g., "links.example.com")
	 * @param expectedToken - The verification token to look for
	 * @returns true if the TXT record is found with the correct value
	 */
	async verifyTxtRecord(domain: string, expectedToken: string): Promise<boolean> {
		const txtHost = `_qrcodly-verify.${domain}`;

		this.logger.debug('dns.verify.txt.start', { txtHost, expectedToken });

		// In test environment, return mock result
		if (this.isTestEnvironment) {
			this.logger.debug('dns.verify.txt.mock', { txtHost });
			return false; // Default to false in tests, can be overridden
		}

		try {
			const records = await dns.resolveTxt(txtHost);

			// TXT records come as arrays of strings (chunked), join them
			for (const record of records) {
				const value = record.join('');
				if (value === expectedToken) {
					this.logger.info('dns.verify.txt.success', { txtHost, found: true });
					return true;
				}
			}

			this.logger.info('dns.verify.txt.notFound', {
				txtHost,
				expectedToken,
				foundRecords: records.map((r) => r.join('')),
			});
			return false;
		} catch (error) {
			// DNS errors (ENOTFOUND, ENODATA) mean the record doesn't exist
			const dnsError = error as NodeJS.ErrnoException;
			if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
				this.logger.debug('dns.verify.txt.notExists', { txtHost, code: dnsError.code });
				return false;
			}

			// Other errors should be logged but not thrown
			this.logger.error('dns.verify.txt.error', {
				txtHost,
				error: dnsError.message,
				code: dnsError.code,
			});
			return false;
		}
	}

	/**
	 * Verifies that the CNAME record points to the expected target.
	 *
	 * @param domain - The domain to verify (e.g., "links.example.com")
	 * @returns true if the CNAME record points to the correct target
	 */
	async verifyCnameRecord(domain: string): Promise<boolean> {
		this.logger.debug('dns.verify.cname.start', { domain, expectedTarget: this.cnameTarget });

		// In test environment, return mock result
		if (this.isTestEnvironment) {
			this.logger.debug('dns.verify.cname.mock', { domain });
			return false; // Default to false in tests, can be overridden
		}

		try {
			const records = await dns.resolveCname(domain);

			// Check if any CNAME record matches the expected target
			for (const record of records) {
				// Normalize both values (remove trailing dots, lowercase)
				const normalizedRecord = record.toLowerCase().replace(/\.$/, '');
				const normalizedTarget = this.cnameTarget.toLowerCase().replace(/\.$/, '');

				if (normalizedRecord === normalizedTarget) {
					this.logger.info('dns.verify.cname.success', { domain, found: true });
					return true;
				}
			}

			this.logger.info('dns.verify.cname.notFound', {
				domain,
				expectedTarget: this.cnameTarget,
				foundRecords: records,
			});
			return false;
		} catch (error) {
			// DNS errors (ENOTFOUND, ENODATA) mean the record doesn't exist
			const dnsError = error as NodeJS.ErrnoException;
			if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
				this.logger.warn('dns.verify.cname.notExists', { domain, code: dnsError.code });
				return false;
			}

			// Other errors should be logged but not thrown
			this.logger.error('dns.verify.cname.error', {
				domain,
				error: dnsError.message,
				code: dnsError.code,
			});
			return false;
		}
	}

	/**
	 * Verifies both ownership TXT and CNAME records for a domain.
	 *
	 * @param domain - The domain to verify (e.g., "links.example.com")
	 * @param verificationToken - The UUID token to verify in the TXT record
	 * @returns Verification result with status for each record type
	 */
	async verifyDnsRecords(
		domain: string,
		verificationToken: string,
	): Promise<IDnsVerificationResult> {
		this.logger.info('dns.verify.start', { domain });

		// Run both verifications in parallel
		const [ownershipTxtVerified, cnameVerified] = await Promise.all([
			this.verifyTxtRecord(domain, verificationToken),
			this.verifyCnameRecord(domain),
		]);

		this.logger.info('dns.verify.complete', {
			domain,
			ownershipTxtVerified,
			cnameVerified,
		});

		return {
			ownershipTxtVerified,
			cnameVerified,
		};
	}
}
