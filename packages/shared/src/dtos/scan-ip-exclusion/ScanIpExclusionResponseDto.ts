import { z } from 'zod';
import { AbstractEntitySchema } from '../../schemas/AbstractEntitySchema';

export const ScanIpExclusionResponseDto = AbstractEntitySchema.extend({
	ipRange: z.string(),
	label: z.string().nullable(),
});

export type TScanIpExclusionResponseDto = z.infer<typeof ScanIpExclusionResponseDto>;

export const ScanIpExclusionListResponseDto = z.array(ScanIpExclusionResponseDto);

export type TScanIpExclusionListResponseDto = z.infer<typeof ScanIpExclusionListResponseDto>;

export const ScanIpExclusionIdParamsDto = z.object({
	id: z.uuid(),
});

export type TScanIpExclusionIdParamsDto = z.infer<typeof ScanIpExclusionIdParamsDto>;

/** The public IP the API saw for the caller, so they can exclude their own network in one click */
export const CurrentClientIpResponseDto = z.object({
	ip: z.string().nullable(),
});

export type TCurrentClientIpResponseDto = z.infer<typeof CurrentClientIpResponseDto>;
