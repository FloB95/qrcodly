import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { injectable } from 'tsyringe';
import { TCustomDomain } from '../domain/entities/custom-domain.entity';
import { env } from '@/core/config/env';
import { type TSetupInstructionsResponseDto } from '@shared/schemas';

/**
 * Use case for getting setup instructions for a Custom Domain.
 * Returns DNS records required for domain verification and human-readable instructions.
 */
@injectable()
export class GetSetupInstructionsUseCase implements IBaseUseCase {
	/**
	 * Executes the use case to get setup instructions for a Custom Domain.
	 * @param customDomain The Custom Domain entity.
	 * @returns Setup instructions with DNS records and human-readable text.
	 */
	execute(customDomain: TCustomDomain): TSetupInstructionsResponseDto {
		const phase = customDomain.verificationPhase;

		// Extract subdomain for DNS record display (e.g., "links" from "links.example.com")
		// DNS providers typically want just the host part, not the full domain
		const subdomain = this.extractSubdomain(customDomain.domain);

		// Build DCV delegation CNAME value: <hostname>.<dcv-delegation-target>
		// This enables automatic SSL certificate issuance and renewal via Cloudflare
		const dcvDelegationValue = `${customDomain.domain}.${env.CLOUDFLARE_DCV_DELEGATION_TARGET}`;

		return {
			phase,
			// Ownership TXT record (our verification token) - shown in Phase 1
			ownershipValidationRecord:
				customDomain.ownershipValidationTxtName && customDomain.ownershipValidationTxtValue
					? {
							recordType: 'TXT',
							recordHost: customDomain.ownershipValidationTxtName,
							recordValue: customDomain.ownershipValidationTxtValue,
						}
					: null,
			// CNAME record - shown in Phase 1
			cnameRecord: {
				recordType: 'CNAME',
				recordHost: subdomain,
				recordValue: env.CUSTOM_DOMAIN_CNAME_TARGET,
			},
			// DCV delegation CNAME for automatic SSL certificate issuance/renewal
			// This delegates the ACME challenge to Cloudflare, enabling automatic cert management
			dcvDelegationRecord: {
				recordType: 'CNAME',
				recordHost: `_acme-challenge.${subdomain}`,
				recordValue: dcvDelegationValue,
			},
			// SSL TXT record (from Cloudflare) - only available in Phase 2
			sslValidationRecord:
				phase === 'cloudflare_ssl' &&
				customDomain.sslValidationTxtName &&
				customDomain.sslValidationTxtValue
					? {
							recordType: 'TXT',
							recordHost: customDomain.sslValidationTxtName,
							recordValue: customDomain.sslValidationTxtValue,
						}
					: null,
			ownershipTxtVerified: customDomain.ownershipTxtVerified ?? false,
			cnameVerified: customDomain.cnameVerified ?? false,
			dcvDelegationVerified: false, // Not tracked - this is optional for automatic renewals
			instructions: this.buildInstructions(customDomain),
		};
	}

	/**
	 * Extracts the subdomain from a full domain.
	 * e.g., "links.example.com" -> "links"
	 * e.g., "app.links.example.com" -> "app.links"
	 */
	private extractSubdomain(domain: string): string {
		const parts = domain.split('.');
		return parts.slice(0, -2).join('.');
	}

	/**
	 * Builds human-readable setup instructions based on verification phase.
	 */
	private buildInstructions(customDomain: TCustomDomain): string {
		const phase = customDomain.verificationPhase || 'dns_verification';
		const lines: string[] = [];

		const subdomain = this.extractSubdomain(customDomain.domain);
		const dcvDelegationValue = `${customDomain.domain}.${env.CLOUDFLARE_DCV_DELEGATION_TARGET}`;

		if (phase === 'dns_verification') {
			lines.push('Add the following DNS records to verify domain ownership:');
			lines.push('');

			// Step 1: Ownership TXT
			const ownershipStatus = customDomain.ownershipTxtVerified ? ' ✓' : '';
			lines.push(`1. Ownership Verification (TXT Record)${ownershipStatus}`);
			if (customDomain.ownershipValidationTxtName && customDomain.ownershipValidationTxtValue) {
				lines.push(`   Host: ${customDomain.ownershipValidationTxtName}`);
				lines.push(`   Value: ${customDomain.ownershipValidationTxtValue}`);
			}

			lines.push('');

			// Step 2: CNAME
			const cnameStatus = customDomain.cnameVerified ? ' ✓' : '';
			lines.push(`2. Routing (CNAME Record)${cnameStatus}`);
			lines.push(`   Host: ${subdomain}`);
			lines.push(`   Points to: ${env.CUSTOM_DOMAIN_CNAME_TARGET}`);

			lines.push('');

			// Step 3: DCV Delegation CNAME
			lines.push('3. SSL Certificate Auto-Renewal (CNAME Record)');
			lines.push(`   Host: _acme-challenge.${subdomain}`);
			lines.push(`   Points to: ${dcvDelegationValue}`);
			lines.push('   Note: This enables automatic SSL certificate issuance and renewal.');

			lines.push('');
			lines.push('Once records 1 and 2 are verified, SSL provisioning will begin automatically.');
		} else {
			// Phase 2: cloudflare_ssl
			lines.push('DNS verified! Now add the SSL validation record:');
			lines.push('');

			// Steps 1-3 completed/shown
			lines.push('1. Ownership Verification (TXT Record) ✓');
			lines.push('2. Routing (CNAME Record) ✓');
			lines.push('3. SSL Certificate Auto-Renewal (CNAME Record)');
			lines.push(`   Host: _acme-challenge.${subdomain}`);
			lines.push(`   Points to: ${dcvDelegationValue}`);

			lines.push('');

			// Step 4: SSL TXT
			const sslStatus = customDomain.sslStatus === 'active' ? ' ✓' : '';
			lines.push(`4. SSL Validation (TXT Record)${sslStatus}`);
			if (customDomain.sslValidationTxtName && customDomain.sslValidationTxtValue) {
				lines.push(`   Host: ${customDomain.sslValidationTxtName}`);
				lines.push(`   Value: ${customDomain.sslValidationTxtValue}`);
			}
		}

		lines.push('');
		lines.push('Note: DNS changes may take up to 48 hours to propagate.');

		return lines.join('\n');
	}
}
