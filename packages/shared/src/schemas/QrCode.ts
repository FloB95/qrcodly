import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema'; // Stelle sicher, dass der Pfad korrekt ist

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((value) => (value === '' ? undefined : value), schema);

export const UrlInputSchema = z.object({
	url: z.url().max(1000),
	isEditable: z.boolean().optional(),
});
export type TUrlInput = z.infer<typeof UrlInputSchema>;

export const TextInputSchema = z.string().max(1000);
export type TTextInput = string;

export const WifiInputSchema = z.object({
	ssid: z.string().max(32).min(1),
	password: z.string().max(64),
	encryption: z.enum(['WPA', 'WEP', 'nopass']),
});
export type TWifiInput = z.infer<typeof WifiInputSchema>;

export const VCardInputSchema = z.object({
	firstName: emptyStringToUndefined(z.string().max(64).optional()),
	lastName: emptyStringToUndefined(z.string().max(64).optional()),
	email: emptyStringToUndefined(z.email().optional()),
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
	website: emptyStringToUndefined(z.url().optional()),
});
export type TVCardInput = z.infer<typeof VCardInputSchema>;

export const LocationInputSchema = z.object({
	address: z.string().min(1),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
});
export type TLocationInput = z.infer<typeof LocationInputSchema>;

export const EmailInputSchema = z.object({
	email: z.email(),
	subject: z.string().optional(),
	body: z.string().optional(),
});
export type TEmailInput = z.infer<typeof EmailInputSchema>;

export const PhoneInputSchema = z.object({
	phone: z.string().min(3),
});
export type TPhoneInput = z.infer<typeof PhoneInputSchema>;

export const SmsInputSchema = z.object({
	phone: z.string().min(3),
	message: z.string().optional(),
});
export type TSmsInput = z.infer<typeof SmsInputSchema>;

export const SocialPlatformEnum = z.enum([
	'instagram',
	'whatsapp',
	'tiktok',
	'youtube',
	'website',
	'spotify',
	'threads',
	'facebook',
	'x',
	'soundcloud',
	'snapchat',
	'pinterest',
	'patreon',
]);

export const SocialLinkSchema = z.object({
	platform: SocialPlatformEnum,
	label: z.string().min(1),
	url: z.string().url(),
});

export const SocialInputSchema = z.object({
	title: z.string().min(1),
	links: z.array(SocialLinkSchema).min(1),
});

export type TSocialInput = z.infer<typeof SocialInputSchema>;
export type TSocialPlatform = z.infer<typeof SocialPlatformEnum>;

export const EventInputSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	location: z.string().optional(),
	startDate: z
		.string()
		.min(1)
		.transform((value) => new Date(value).toISOString()),

	endDate: z
		.string()
		.min(1)
		.transform((value) => new Date(value).toISOString()),
});

export type TEventInput = z.infer<typeof EventInputSchema>;

// Alle Typen als Literal-Union
export const QrCodeContentType = z.union([
	z.literal('url'),
	z.literal('text'),
	z.literal('wifi'),
	z.literal('vCard'),
	z.literal('email'),
	z.literal('location'),
	z.literal('event'),
	z.literal('socials'),
]);
export type TQrCodeContentType = z.infer<typeof QrCodeContentType>;

const ContentSchemas = {
	url: UrlInputSchema,
	text: TextInputSchema,
	wifi: WifiInputSchema,
	vCard: VCardInputSchema,
	email: EmailInputSchema,
	location: LocationInputSchema,
	event: EventInputSchema,
	socials: SocialInputSchema,
} as const;

const createContentSchema = <T extends keyof typeof ContentSchemas>(type: T) =>
	z.object({
		type: z.literal(type),
		data: ContentSchemas[type],
	});

export const QrCodeContent = z.discriminatedUnion('type', [
	createContentSchema('url'),
	createContentSchema('text'),
	createContentSchema('wifi'),
	createContentSchema('vCard'),
	createContentSchema('email'),
	createContentSchema('location'),
	createContentSchema('event'),
	createContentSchema('socials'),
]);

export type TQrCodeContent = z.infer<typeof QrCodeContent>;

export const DotType = z.enum([
	'dots',
	'rounded',
	'classy',
	'classy-rounded',
	'square',
	'extra-rounded',
]);
export type TDotType = z.infer<typeof DotType>;

export const CornerDotType = z.enum(['dot', 'square']);
export type TCornerDotType = z.infer<typeof CornerDotType>;

export const CornerSquareType = z.enum(['dot', 'square', 'extra-rounded']);
export type TCornerSquareType = z.infer<typeof CornerSquareType>;

export const FileExtension = z.enum(['svg', 'png', 'jpeg', 'webp']);
export type TFileExtension = z.infer<typeof FileExtension>;

export const Gradient = z.object({
	type: z.literal('gradient'),
	gradientType: z.enum(['radial', 'linear']),
	rotation: z.number(),
	colorStops: z
		.array(
			z.object({
				offset: z.number(),
				color: z.string().regex(/^#[0-9a-f]{6}$/i),
			}),
		)
		.length(2),
});

const HexColor = z.object({
	type: z.literal('hex'),
	value: z.string().regex(/^#[0-9A-F]{6}$/i),
});

const RgbaColor = z.object({
	type: z.literal('rgba'),
	value: z
		.string()
		.regex(/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i),
});

export const ColorOrGradient = z.discriminatedUnion('type', [HexColor, RgbaColor, Gradient]);
export type TColorOrGradient = z.infer<typeof ColorOrGradient>;

export const QrCodeOptionsSchema = z.object({
	width: z.number(),
	height: z.number(),
	margin: z.number(),
	image: z
		.string()
		.max(0.5 * 1024 * 1024, 'Image is to large! Max size is 0.5 MB.')
		.optional()
		.describe('The image as base64 to be embedded in the QR code. Max size 0.5 MB.'),
	imageOptions: z.object({
		hideBackgroundDots: z.boolean(),
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

export const QrCodeSchema = AbstractEntitySchema.extend({
	name: z.string().max(32).nullable(),
	config: QrCodeOptionsSchema,
	content: QrCodeContent,
	previewImage: z.string().nullable(),
	createdBy: z.string().nullable(),
});

export type TQrCode = z.infer<typeof QrCodeSchema>;
