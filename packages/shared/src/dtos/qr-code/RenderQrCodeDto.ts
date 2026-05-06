import { z } from 'zod';
import { QrCodeOptionsSchema } from '../../schemas/QrCode';

export const RENDER_QR_CODE_FORMATS = ['png', 'webp', 'jpeg', 'svg'] as const;

export const RENDER_QR_CODE_MIME_TYPES: Record<(typeof RENDER_QR_CODE_FORMATS)[number], string> = {
	png: 'image/png',
	webp: 'image/webp',
	jpeg: 'image/jpeg',
	svg: 'image/svg+xml',
};

export const RenderQrCodeDto = z.object({
	config: QrCodeOptionsSchema,
	data: z.string().min(1).max(4000),
	format: z.enum(RENDER_QR_CODE_FORMATS).optional(),
	sizePx: z.number().int().positive().max(4096).optional(),
	// PNG only. Embeds DPI metadata so layout apps place the file at this
	// physical size (in millimetres) instead of inflating it to 72 DPI.
	printSizeMm: z.number().positive().max(500).optional(),
});

export type TRenderQrCodeDto = z.infer<typeof RenderQrCodeDto>;
export type TRenderQrCodeFormat = (typeof RENDER_QR_CODE_FORMATS)[number];
