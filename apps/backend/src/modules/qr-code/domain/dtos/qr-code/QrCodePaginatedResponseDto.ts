import { type z } from 'zod';
import { QrCodeResponseDto } from './QrCodeResponseDto';
import { PaginationResponseDtoSchema } from '@/core/domain/dto/PaginationDto';

export const QrCodePaginatedResponseDto = PaginationResponseDtoSchema(QrCodeResponseDto);

export type TQrCodePaginatedResponseDto = z.infer<typeof QrCodePaginatedResponseDto>;
