/***************************
 * DTOs
 **************************/
export { CreateQrCodeDto } from './dtos/qr-code/CreateQrCodeDto';
export type { TCreateQrCodeDto } from './dtos/qr-code/CreateQrCodeDto';

export { QrCodesRequestDtoSchema } from './dtos/qr-code/QrCodeListRequestDto';
export type { TQrCodesRequestDto } from './dtos/qr-code/QrCodeListRequestDto';

export { QrCodePaginatedResponseDto } from './dtos/qr-code/QrCodePaginatedResponseDto';
export type { TQrCodePaginatedResponseDto } from './dtos/qr-code/QrCodePaginatedResponseDto';

export { GetQrCodeQueryParamsSchema } from './dtos/qr-code/QrCodeRequestParamsDto';
export type { TGetQrCodeQueryParamsDto } from './dtos/qr-code/QrCodeRequestParamsDto';

export { QrCodeResponseDto } from './dtos/qr-code/QrCodeResponseDto';
export type { TQrCodeResponseDto } from './dtos/qr-code/QrCodeResponseDto';

export { ConfigTemplateResponseDtoSchema } from './dtos/qr-code-templates/TConfigTemplateResponseDto';
export type { TConfigTemplateResponseDto } from './dtos/qr-code-templates/TConfigTemplateResponseDto';

export { CreateConfigTemplateDtoSchema } from './dtos/qr-code-templates/TCreateConfigTemplateDto';
export type { TCreateConfigTemplateDto } from './dtos/qr-code-templates/TCreateConfigTemplateDto';

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
	convertQRCodeDataToStringByType,
	convertWiFiObjToString,
	convertVCardObjToString,
} from './utils';
