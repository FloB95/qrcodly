import { type z } from 'zod';
import { QrCodeResponseDto, QrCodeWithRelationsResponseDto } from './QrCodeResponseDto';
import { PaginationResponseDtoSchema } from '../PaginationDto';
import { type TQrCode } from '../../schemas/QrCode';

export const QrCodePaginatedResponseDto = PaginationResponseDtoSchema<TQrCode>(QrCodeResponseDto);

export type TQrCodePaginatedResponseDto = z.infer<typeof QrCodePaginatedResponseDto>;

export const QrCodeWithRelationsPaginatedResponseDto = PaginationResponseDtoSchema(
	QrCodeWithRelationsResponseDto,
);
export type TQrCodeWithRelationsPaginatedResponseDto = z.infer<
	typeof QrCodeWithRelationsPaginatedResponseDto
>;
