import { type z } from 'zod';
import { QrCodeResponseDto } from './QrCodeResponseDto';
import { PaginationResponseDtoSchema } from '../PaginationDto';
import { type TQrCode } from '../../schemas/QrCode';

export const QrCodePaginatedResponseDto = PaginationResponseDtoSchema<TQrCode>(QrCodeResponseDto);

export type TQrCodePaginatedResponseDto = z.infer<typeof QrCodePaginatedResponseDto>;
