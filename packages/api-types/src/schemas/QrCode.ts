import { BaseEntitySchema } from '../dtos/base/BaseEntity';
import { z } from 'zod';

const emptyStringToUndefined = <T extends z.ZodTypeAny>(
	schema: T,
): z.ZodEffects<T, z.infer<T> | undefined> =>
	z.preprocess((value) => (value === '' ? undefined : value), schema);

export const UrlInputSchema = z.string().url();
export type TUrlInput = z.infer<typeof UrlInputSchema>;

export const TextInputSchema = z.string().max(1000);
export type TTextInput = z.infer<typeof TextInputSchema>;

export const WifiInputSchema = z.object({
	ssid: z.string().max(32),
	password: emptyStringToUndefined(z.string().max(64).optional()),
	encryption: z.enum(['WPA', 'WEP', 'nopass']),
});
export type TWifiInput = z.infer<typeof WifiInputSchema>;

export const VCardInputSchema = z.object({
	firstName: emptyStringToUndefined(z.string().max(64).optional()),
	lastName: emptyStringToUndefined(z.string().max(64).optional()),
	email: emptyStringToUndefined(z.string().email().optional()),
	phone: emptyStringToUndefined(
		z
			.string()
			.regex(/^\+?\d{1,4}\d{6,15}$/)
			.optional(),
	),
	fax: emptyStringToUndefined(
		z
			.string()
			.regex(/^\+?\d{1,4}\d{6,15}$/)
			.optional(),
	),
	company: emptyStringToUndefined(z.string().max(64).optional()),
	job: emptyStringToUndefined(z.string().max(64).optional()),
	street: emptyStringToUndefined(z.string().max(64).optional()),
	city: emptyStringToUndefined(z.string().max(64).optional()),
	zip: emptyStringToUndefined(z.string().max(10).optional()),
	state: emptyStringToUndefined(z.string().max(64).optional()),
	country: emptyStringToUndefined(z.string().max(64).optional()),
	website: emptyStringToUndefined(z.string().url().optional()),
});
export type TVCardInput = z.infer<typeof VCardInputSchema>;

export const QrCodeContentSchema = z
	.union([UrlInputSchema, TextInputSchema, WifiInputSchema, VCardInputSchema])
	.describe('The actual content of the QR code. (valid URL, text, wifi, vCard...)');

export type TQrCodeContent = z.infer<typeof QrCodeContentSchema>;

// Define the type mapping
export type TQrCodeContentMap = {
	url: z.infer<typeof UrlInputSchema>;
	text: z.infer<typeof TextInputSchema>;
	wifi: z.infer<typeof WifiInputSchema>;
	vCard: z.infer<typeof VCardInputSchema>;
};

/**
 * Type definition for specifying the type of dots.
 */
export const DotType = z.enum([
	'dots',
	'rounded',
	'classy',
	'classy-rounded',
	'square',
	'extra-rounded',
]);
export type TDotType = z.infer<typeof DotType>;

/**
 * Type definition for specifying the type of corner dots.
 */
export const CornerDotType = z.enum(['dot', 'square']);
export type TCornerDotType = z.infer<typeof CornerDotType>;

/**
 * Type definition for specifying the type of corner squares.
 */
export const CornerSquareType = z.enum(['dot', 'square', 'extra-rounded']);
export type TCornerSquareType = z.infer<typeof CornerSquareType>;

/**
 * Type definition for specifying file extensions.
 */
export const FileExtension = z.enum(['svg', 'png', 'jpeg', 'webp']);
export type TFileExtension = z.infer<typeof FileExtension>;

/**
 * Type definition for specifying the type of gradient.
 */
export const GradientType = z.enum(['radial', 'linear']);

/**
 * Type definition for specifying a gradient.
 */
export const Gradient = z.object({
	type: GradientType.default('linear'),
	rotation: z.number().default(0),
	colorStops: z
		.array(
			z.object({
				offset: z.number(),
				color: z.string().regex(/^#[0-9A-F]{6}$/i),
			}),
		)
		.min(2)
		.max(2),
});

export const ColorOrGradient = z.union([z.string().regex(/^#[0-9A-F]{6}$/i), Gradient]);

/**
 * Type definition for specifying the content type of the QR code.
 */
export const QrCodeContentType = z.union([
	z.literal('url'),
	z.literal('text'),
	z.literal('wifi'),
	z.literal('vCard'),
]);
export type TQrCodeContentType = z.infer<typeof QrCodeContentType>;

/**
 * Type definition for specifying QR code generation options.
 */
export const QrCodeOptionsSchema = z.object({
	width: z.number().default(1000),
	height: z.number().default(1000),
	margin: z.number().default(0),
	image: z
		.string()
		.max(0.5 * 1024 * 1024, 'Image is to large! Max size is 0.5 MB.')
		.optional()
		.describe('The image as base64 to be embedded in the QR code. Max size 0.5 MB.'),
	imageOptions: z.object({
		hideBackgroundDots: z.boolean().default(true),
	}),
	dotsOptions: z.object({
		type: DotType,
		style: ColorOrGradient,
	}),
	cornersSquareOptions: z.object({
		type: CornerSquareType,
		style: ColorOrGradient,
	}),
	cornersDotOptions: z.object({
		type: CornerDotType,
		style: ColorOrGradient,
	}),
	backgroundOptions: z.object({
		style: ColorOrGradient,
	}),
});

export type TQrCodeOptions = z.infer<typeof QrCodeOptionsSchema>;

/**
 * Schema definition for QR code entity.
 */
export const QrCodeSchema = BaseEntitySchema.extend({
	config: QrCodeOptionsSchema,
	contentType: QrCodeContentType,
	content: QrCodeContentSchema,
	createdBy: z.string().nullable(),
}).superRefine((values, ctx) => {
	const { contentType, content } = values;

	// Validate the original data based on the content type
	switch (contentType) {
		case 'url':
			if (!UrlInputSchema.safeParse(content).success) {
				ctx.addIssue({
					code: 'custom',
					path: ['content'],
					message: 'Invalid URL format.',
				});
			}
			break;

		case 'text':
			if (!TextInputSchema.safeParse(content).success) {
				ctx.addIssue({
					code: 'custom',
					path: ['content'],
					message: 'Text must be a string with a maximum length of 1000 characters.',
				});
			}
			break;

		case 'wifi':
			if (!WifiInputSchema.safeParse(content).success) {
				ctx.addIssue({
					code: 'custom',
					path: ['content'],
					message: 'Invalid WiFi configuration.',
				});
			}
			break;

		case 'vCard':
			if (!VCardInputSchema.safeParse(content).success) {
				ctx.addIssue({
					code: 'custom',
					path: ['content'],
					message: 'Invalid vCard configuration.',
				});
			}
			break;

		default:
			ctx.addIssue({
				code: 'custom',
				path: ['contentType'],
				message: 'Unsupported content type.',
			});
	}
});

export type TQrCode = z.infer<typeof QrCodeSchema>;