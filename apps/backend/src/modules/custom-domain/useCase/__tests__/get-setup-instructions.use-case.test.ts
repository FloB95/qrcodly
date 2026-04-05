import 'reflect-metadata';
import { GetSetupInstructionsUseCase } from '../get-setup-instructions.use-case';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';

jest.mock('@/core/config/env', () => ({
	env: {
		CUSTOM_DOMAIN_CNAME_TARGET: 'customers.qrcodly.de',
		CLOUDFLARE_DCV_DELEGATION_TARGET: 'd0a467ae32366c3f.dcv.cloudflare.com',
	},
}));

describe('GetSetupInstructionsUseCase', () => {
	let useCase: GetSetupInstructionsUseCase;

	const baseDomain: TCustomDomain = {
		id: 'domain-1',
		domain: 'links.example.com',
		isDefault: false,
		isEnabled: true,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
		verificationPhase: 'dns_verification',
		ownershipTxtVerified: false,
		cnameVerified: false,
		cloudflareHostnameId: null,
		sslStatus: 'initializing',
		ownershipStatus: 'pending',
		ownershipValidationTxtName: '_qrcodly-verify.links',
		ownershipValidationTxtValue: 'verify-token-123',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		validationErrors: null,
	};

	beforeEach(() => {
		useCase = new GetSetupInstructionsUseCase();
	});

	it('should return dns_verification phase instructions', () => {
		const result = useCase.execute(baseDomain);

		expect(result.phase).toBe('dns_verification');
	});

	it('should include ownership TXT record in Phase 1', () => {
		const result = useCase.execute(baseDomain);

		expect(result.ownershipValidationRecord).toEqual({
			recordType: 'TXT',
			recordHost: '_qrcodly-verify.links',
			recordValue: 'verify-token-123',
		});
	});

	it('should include CNAME record pointing to configured target', () => {
		const result = useCase.execute(baseDomain);

		expect(result.cnameRecord).toEqual({
			recordType: 'CNAME',
			recordHost: 'links',
			recordValue: 'customers.qrcodly.de',
		});
	});

	it('should include DCV delegation CNAME record', () => {
		const result = useCase.execute(baseDomain);

		expect(result.dcvDelegationRecord).toEqual({
			recordType: 'CNAME',
			recordHost: '_acme-challenge.links',
			recordValue: 'links.example.com.d0a467ae32366c3f.dcv.cloudflare.com',
		});
	});

	it('should not include SSL TXT record in Phase 1', () => {
		const result = useCase.execute(baseDomain);

		expect(result.sslValidationRecord).toBeNull();
	});

	it('should include SSL TXT record in Phase 2 when available', () => {
		const phase2Domain: TCustomDomain = {
			...baseDomain,
			verificationPhase: 'cloudflare_ssl',
			ownershipTxtVerified: true,
			cnameVerified: true,
			cloudflareHostnameId: 'cf-hostname-1',
			sslStatus: 'pending_validation',
			ownershipStatus: 'verified',
			sslValidationTxtName: '_dnsauth.links.example.com',
			sslValidationTxtValue: 'ssl-token-456',
		};

		const result = useCase.execute(phase2Domain);

		expect(result.sslValidationRecord).toEqual({
			recordType: 'TXT',
			recordHost: '_dnsauth.links.example.com',
			recordValue: 'ssl-token-456',
		});
	});

	it('should reflect verified status', () => {
		const verifiedDomain: TCustomDomain = {
			...baseDomain,
			ownershipTxtVerified: true,
			cnameVerified: true,
		};

		const result = useCase.execute(verifiedDomain);

		expect(result.ownershipTxtVerified).toBe(true);
		expect(result.cnameVerified).toBe(true);
	});

	it('should return instructions text', () => {
		const result = useCase.execute(baseDomain);

		expect(result.instructions).toBeDefined();
		expect(typeof result.instructions).toBe('string');
		expect(result.instructions.length).toBeGreaterThan(0);
	});
});
