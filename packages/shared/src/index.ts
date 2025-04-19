/***************************
 * DTOs
 **************************/
export { CreateQrCodeDto } from './dtos/qr-code/CreateQrCodeDto';
export type { TCreateQrCodeDto, TCreateQrCodeResponseDto } from './dtos/qr-code/CreateQrCodeDto';

export { QrCodesRequestDtoSchema } from './dtos/qr-code/QrCodeListRequestDto';
export type { TQrCodesRequestDto } from './dtos/qr-code/QrCodeListRequestDto';

export { QrCodePaginatedResponseDto } from './dtos/qr-code/QrCodePaginatedResponseDto';
export type { TQrCodePaginatedResponseDto } from './dtos/qr-code/QrCodePaginatedResponseDto';

export { GetQrCodeQueryParamsSchema } from './dtos/qr-code/QrCodeRequestParamsDto';
export type { TGetQrCodeQueryParamsDto } from './dtos/qr-code/QrCodeRequestParamsDto';

export { QrCodeResponseDto } from './dtos/qr-code/QrCodeResponseDto';
export type { TQrCodeResponseDto } from './dtos/qr-code/QrCodeResponseDto';

export { ConfigTemplatePaginatedResponseDto } from './dtos/qr-code-templates/ConfigTemplatePaginatedResponseDto';
export type { TConfigTemplatePaginatedResponseDto } from './dtos/qr-code-templates/ConfigTemplatePaginatedResponseDto';

export { ConfigTemplateResponseDto } from './dtos/qr-code-templates/ConfigTemplateResponseDto';
export type { TConfigTemplateResponseDto } from './dtos/qr-code-templates/ConfigTemplateResponseDto';

export { CreateConfigTemplateDto } from './dtos/qr-code-templates/CreateConfigTemplateDto';
export type { TCreateConfigTemplateDto } from './dtos/qr-code-templates/CreateConfigTemplateDto';

export { GetConfigTemplateQueryParamsDto } from './dtos/qr-code-templates/ConfigTemplateRequestParamsDto';
export type { TGetConfigTemplateQueryParamsDto } from './dtos/qr-code-templates/ConfigTemplateRequestParamsDto';

export { IdRequestQueryDto } from './dtos/IdRequestQuery';
export type { TIdRequestQueryDto } from './dtos/IdRequestQuery';

export { PaginationQueryParamsSchema } from './dtos/ListRequestDto';

export { PaginationResponseDtoSchema } from './dtos/PaginationDto';
export type { IPaginationDto } from './dtos/PaginationDto';

/***************************
 * Schemas
 **************************/
export { AbstractEntitySchema } from './schemas/AbstractEntitySchema';

export {
	UrlInputSchema,
	TextInputSchema,
	WifiInputSchema,
	VCardInputSchema,
	QrCodeOptionsSchema,
} from './schemas/QrCode';

export type {
	TFileExtension,
	TQrCode,
	TUrlInput,
	TTextInput,
	TWifiInput,
	TVCardInput,
	TQrCodeOptions,
	TQrCodeContentMap,
	TQrCodeContent,
	TQrCodeContentType,
} from './schemas/QrCode';

export * from './schemas/QrCodeConfigTemplate';

/***************************
 * Utils
 **************************/
export {
	convertQrCodeOptionsToLibraryOptions,
	convertQRCodeDataToStringByType,
	convertWiFiObjToString,
	convertVCardObjToString,
} from './utils';

export { QrCodeDefaults } from './utils/QrCodeDefaults';
