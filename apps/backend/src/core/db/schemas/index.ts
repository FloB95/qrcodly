export {
	default as qrCode,
	qrCodeRelations,
} from '@/modules/qr-code/domain/entities/qr-code.entity';
export {
	default as qrCodeShare,
	qrCodeShareRelations,
} from '@/modules/qr-code/domain/entities/qr-code-share.entity';
export { default as configTemplate } from '@/modules/config-template/domain/entities/config-template.entity';
export {
	default as shortUrl,
	shortUrlRelations,
} from '@/modules/url-shortener/domain/entities/short-url.entity';
export {
	default as customDomain,
	customDomainRelations,
} from '@/modules/custom-domain/domain/entities/custom-domain.entity';
export { default as userSubscription } from '@/modules/billing/domain/entities/user-subscription.entity';
export { default as tag, tagRelations } from '@/modules/tag/domain/entities/tag.entity';
export {
	default as qrCodeTag,
	qrCodeTagRelations,
} from '@/modules/tag/domain/entities/qr-code-tag.entity';
