import { type z } from 'zod';
import { PaginationResponseDtoSchema } from '../PaginationDto';
import { ConfigTemplateResponseDto } from './ConfigTemplateResponseDto';
import { TConfigTemplate } from '../../schemas/QrCodeConfigTemplate';

export const ConfigTemplatePaginatedResponseDto =
	PaginationResponseDtoSchema<TConfigTemplate>(ConfigTemplateResponseDto);

export type TConfigTemplatePaginatedResponseDto = z.infer<typeof ConfigTemplatePaginatedResponseDto>;
