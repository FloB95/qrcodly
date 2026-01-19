import { injectable, inject } from 'tsyringe';
import { promises as dns } from 'dns';
import { Logger } from '@/core/logging';
import { env } from '@/core/config/env';

/**
 * DNS verification result.
 */
export interface IDnsVerificationResult {
	success: boolean;
	message: string;
}

/**
 * Service for verifying custom domain ownership via DNS TXT records
 * and CNAME configuration for routing.
 *
 * Users need to:
 * 1. Add a TXT record at: _qrcodly-verify.{domain} with value: qrcodly-verify={verificationToken}
 * 2. Add a CNAME record pointing the domain to our fallback origin
 *
 * Example:
 * - Domain: links.example.com
 * - TXT Record Host: _qrcodly-verify.links.example.com
 * - TXT Record Value: qrcodly-verify=abc123...
 * - CNAME Record: links.example.com -> qrcodly.fallback.example.com
 */
@injectable()
export class DnsVerificationService {
	private readonly TXT_RECORD_PREFIX = '_qrcodly-verify';
	private readonly TXT_VALUE_PREFIX = 'qrcodly-verify=';
	private readonly CNAME_TARGET = env.CUSTOM_DOMAIN_CNAME_TARGET;

	constructor(@inject(Logger) private readonly logger: Logger) {}

	/**
	 * Verifies domain ownership by checking DNS TXT records.
	 * @param domain - The domain to verify.
	 * @param verificationToken - The expected verification token.
	 * @returns Verification result.
	 */
	async verifyDomain(domain: string, verificationToken: string): Promise<IDnsVerificationResult> {
		const txtRecordHost = `${this.TXT_RECORD_PREFIX}.${domain}`;
		const expectedValue = `${this.TXT_VALUE_PREFIX}${verificationToken}`;

		this.logger.info('dns.verification.started', { domain, txtRecordHost });

		try {
			const records = await dns.resolveTxt(txtRecordHost);

			// DNS TXT records can have multiple strings that need to be concatenated
			for (const record of records) {
				const recordValue = record.join('');
				if (recordValue === expectedValue) {
					this.logger.info('dns.verification.success', { domain });
					return {
						success: true,
						message: 'Domain verified successfully.',
					};
				}
			}

			this.logger.info('dns.verification.failed.token_mismatch', { domain });
			return {
				success: false,
				message: `TXT record found but verification token does not match. Please check your DNS configuration.`,
			};
		} catch (error) {
			const errorCode = (error as NodeJS.ErrnoException).code;

			if (errorCode === 'ENODATA' || errorCode === 'ENOTFOUND') {
				this.logger.info('dns.verification.failed.no_record', { domain, errorCode });
				return {
					success: false,
					message: `No TXT record found at ${txtRecordHost}. Please add a TXT record with the value: ${expectedValue}`,
				};
			}

			this.logger.error('dns.verification.failed.error', { domain, error });
			return {
				success: false,
				message: `DNS lookup failed: ${(error as Error).message}`,
			};
		}
	}

	/**
	 * Gets the verification instructions for a domain.
	 * @param domain - The domain.
	 * @param verificationToken - The verification token.
	 * @returns Instructions object.
	 */
	getVerificationInstructions(
		domain: string,
		verificationToken: string,
	): {
		recordType: string;
		recordHost: string;
		recordValue: string;
		instructions: string;
	} {
		const recordHost = `${this.TXT_RECORD_PREFIX}.${domain}`;
		const recordValue = `${this.TXT_VALUE_PREFIX}${verificationToken}`;

		return {
			recordType: 'TXT',
			recordHost,
			recordValue,
			instructions: `Add a TXT record to your DNS configuration:\n\nHost: ${recordHost}\nValue: ${recordValue}\n\nNote: DNS changes may take up to 48 hours to propagate.`,
		};
	}

	/**
	 * Verifies that a domain has a valid CNAME record pointing to our servers.
	 * @param domain - The domain to verify.
	 * @returns Verification result.
	 */
	async verifyCname(domain: string): Promise<IDnsVerificationResult> {
		this.logger.info('dns.cname.verification.started', {
			domain,
			expectedTarget: this.CNAME_TARGET,
		});

		try {
			const records = await dns.resolveCname(domain);

			for (const record of records) {
				// Check if the CNAME points to our target (case insensitive)
				if (record.toLowerCase() === this.CNAME_TARGET.toLowerCase()) {
					this.logger.info('dns.cname.verification.success', { domain, record });
					return {
						success: true,
						message: 'CNAME record verified successfully.',
					};
				}
			}

			this.logger.info('dns.cname.verification.failed.wrong_target', {
				domain,
				records,
				expectedTarget: this.CNAME_TARGET,
			});
			return {
				success: false,
				message: `CNAME record found but does not point to ${this.CNAME_TARGET}. Found: ${records.join(', ')}`,
			};
		} catch (error) {
			const errorCode = (error as NodeJS.ErrnoException).code;

			if (errorCode === 'ENODATA' || errorCode === 'ENOTFOUND') {
				this.logger.info('dns.cname.verification.failed.no_record', { domain, errorCode });
				return {
					success: false,
					message: `No CNAME record found for ${domain}. Please add a CNAME record pointing to ${this.CNAME_TARGET}`,
				};
			}

			this.logger.error('dns.cname.verification.failed.error', { domain, error });
			return {
				success: false,
				message: `DNS lookup failed: ${(error as Error).message}`,
			};
		}
	}

	/**
	 * Gets the CNAME setup instructions for a domain.
	 * @param domain - The domain.
	 * @returns Instructions object.
	 */
	getCnameInstructions(domain: string): {
		recordType: string;
		recordHost: string;
		recordValue: string;
		instructions: string;
	} {
		return {
			recordType: 'CNAME',
			recordHost: domain,
			recordValue: this.CNAME_TARGET,
			instructions: `Add a CNAME record to your DNS configuration:\n\nHost: ${domain}\nPoints to: ${this.CNAME_TARGET}\n\nNote: DNS changes may take up to 48 hours to propagate.`,
		};
	}

	/**
	 * Gets both TXT and CNAME instructions for complete domain setup.
	 * @param domain - The domain.
	 * @param verificationToken - The verification token.
	 * @returns Combined instructions object.
	 */
	getFullSetupInstructions(
		domain: string,
		verificationToken: string,
	): {
		txtRecord: {
			recordType: string;
			recordHost: string;
			recordValue: string;
		};
		cnameRecord: {
			recordType: string;
			recordHost: string;
			recordValue: string;
		};
		instructions: string;
	} {
		const txtRecordHost = `${this.TXT_RECORD_PREFIX}.${domain}`;
		const txtRecordValue = `${this.TXT_VALUE_PREFIX}${verificationToken}`;

		return {
			txtRecord: {
				recordType: 'TXT',
				recordHost: txtRecordHost,
				recordValue: txtRecordValue,
			},
			cnameRecord: {
				recordType: 'CNAME',
				recordHost: domain,
				recordValue: this.CNAME_TARGET,
			},
			instructions: `To set up your custom domain, add the following DNS records:\n\n1. TXT Record (for verification):\n   Host: ${txtRecordHost}\n   Value: ${txtRecordValue}\n\n2. CNAME Record (for routing):\n   Host: ${domain}\n   Points to: ${this.CNAME_TARGET}\n\nNote: DNS changes may take up to 48 hours to propagate.`,
		};
	}
}
