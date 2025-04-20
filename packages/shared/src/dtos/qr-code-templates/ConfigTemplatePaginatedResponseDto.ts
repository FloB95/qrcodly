import { type z } from 'zod';
import { PaginationResponseDtoSchema } from '../PaginationDto';
import { ConfigTemplateResponseDto } from './ConfigTemplateResponseDto';
import { type TConfigTemplate } from '../../schemas/QrCodeConfigTemplate';

export const ConfigTemplatePaginatedResponseDto =
	PaginationResponseDtoSchema<Omit<TConfigTemplate, 'isPredefined'>>(ConfigTemplateResponseDto);

export type TConfigTemplatePaginatedResponseDto = z.infer<
	typeof ConfigTemplatePaginatedResponseDto
>;
