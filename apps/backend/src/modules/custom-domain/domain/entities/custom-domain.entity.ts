import { customDomain } from '@qrcodly/db';

export {
	customDomainRelations,
	type TCustomDomain,
	VERIFICATION_PHASES,
	SSL_STATUSES,
	OWNERSHIP_STATUSES,
	type TVerificationPhase,
	type TCloudflareSSLStatus,
	type TOwnershipStatus,
} from '@qrcodly/db';
export default customDomain;
