import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema'; // Stelle sicher, dass der Pfad korrekt ist

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((value) => (value === '' ? undefined : value), schema);

export const UrlInputSchema = z.object({
	url: z.url().max(1000).describe('The target URL that the QR code points to'),
	isEditable: z
		.boolean()
		.optional()
		.describe(
			'If true, creates a dynamic QR code with a short URL redirect so the destination can be changed later',
		),
});
export type TUrlInput = z.infer<typeof UrlInputSchema>;

export const TextInputSchema = z.string().min(1).max(1000);
export type TTextInput = string;

const WifiEncryptionSchema = z.enum(['WPA', 'WEP', 'nopass']);
export type TWifiEncryption = z.infer<typeof WifiEncryptionSchema>;

export const WifiInputSchema = z.object({
	ssid: z.string().max(32).min(1).describe('WiFi network name (SSID)'),
	password: z.string().max(64).describe('WiFi password (leave empty for open networks)'),
	encryption: WifiEncryptionSchema.describe('WiFi encryption type: WPA, WEP, or nopass (open)'),
});
export type TWifiInput = z.infer<typeof WifiInputSchema>;

const phoneSchema = emptyStringToUndefined(
	z
		.string()
		.regex(/^(?:\+|0|\d)[0-9\-().]{6,19}$/, 'Invalid phone number')
		.optional(),
);

const emailSchema = emptyStringToUndefined(z.email().max(100).optional());

export const VCardInputSchema = z
	.object({
		title: emptyStringToUndefined(
			z.string().min(1).max(32).optional().describe('Job title or honorific (e.g. Dr., Mr.)'),
		),
		firstName: emptyStringToUndefined(z.string().min(1).max(64).optional().describe('First name')),
		lastName: emptyStringToUndefined(z.string().min(1).max(64).optional().describe('Last name')),
		/** @deprecated Use emailPrivate or emailBusiness instead. Kept for backwards compatibility with existing data. */
		email: emailSchema,
		emailPrivate: emailSchema,
		emailBusiness: emailSchema,
		/** @deprecated Use phoneMobile instead. Kept for backwards compatibility with existing data. */
		phone: phoneSchema,
		phonePrivate: phoneSchema,
		phoneMobile: phoneSchema,
		phoneBusiness: phoneSchema,
		fax: phoneSchema,
		company: emptyStringToUndefined(
			z.string().min(1).max(64).optional().describe('Company or organization name'),
		),
		job: emptyStringToUndefined(
			z.string().min(1).max(64).optional().describe('Job title or position'),
		),
		street: emptyStringToUndefined(z.string().min(1).max(64).optional().describe('Street address')),
		city: emptyStringToUndefined(z.string().min(1).max(64).optional().describe('City')),
		zip: emptyStringToUndefined(z.string().min(1).max(10).optional().describe('Postal / ZIP code')),
		state: emptyStringToUndefined(
			z.string().min(1).max(64).optional().describe('State or province'),
		),
		country: emptyStringToUndefined(z.string().min(1).max(64).optional().describe('Country')),
		website: emptyStringToUndefined(z.url().optional().describe('Personal or company website URL')),
		isDynamic: z
			.boolean()
			.optional()
			.describe('If true, creates a dynamic vCard QR code with an editable short URL'),
	})
	.refine(
		(data) =>
			Object.entries(data).some(([key, value]) => key !== 'isDynamic' && value !== undefined),
		{
			message: 'At least one vCard field must be provided',
		},
	);
export type TVCardInput = z.infer<typeof VCardInputSchema>;

export const LocationInputSchema = z.object({
	address: z
		.string()
		.min(1)
		.max(200)
		.describe('Human-readable address (e.g. "1600 Amphitheatre Parkway, Mountain View, CA")'),
	latitude: z.number().min(-90).max(90).optional().describe('GPS latitude coordinate (-90 to 90)'),
	longitude: z
		.number()
		.min(-180)
		.max(180)
		.optional()
		.describe('GPS longitude coordinate (-180 to 180)'),
});
export type TLocationInput = z.infer<typeof LocationInputSchema>;

export const EmailInputSchema = z.object({
	email: z.email().max(100).describe('Recipient email address'),
	subject: z.string().max(250).optional().describe('Pre-filled email subject line'),
	body: z.string().max(1000).optional().describe('Pre-filled email body text'),
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
	url: z.httpUrl(),
});

export const SocialInputSchema = z.object({
	title: z.string().min(1),
	links: z.array(SocialLinkSchema).min(1),
});

export type TSocialInput = z.infer<typeof SocialInputSchema>;
export type TSocialPlatform = z.infer<typeof SocialPlatformEnum>;

export const EventInputSchema = z
	.object({
		title: z.string().min(1).max(200).describe('Event title or name'),
		description: z.string().max(500).optional().describe('Event description or details'),
		location: z.string().max(200).optional().describe('Event location or venue'),
		url: z.httpUrl().optional().describe('URL with more information about the event'),
		startDate: z.iso
			.datetime()
			.describe('Event start date and time as ISO 8601 string (e.g. "2025-06-15T14:00:00Z")'),
		endDate: z.iso
			.datetime()
			.describe('Event end date and time as ISO 8601 string (must be after startDate)'),
	})
	.refine((data) => new Date(data.startDate) < new Date(data.endDate), {
		message: 'End date must be after start date',
		path: ['endDate'],
	});

export type TEventInput = z.infer<typeof EventInputSchema>;

// IBAN validation regex (basic format check - 2 letter country + 2 check digits + up to 30 alphanumeric)
const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;

export const EpcInputSchema = z.object({
	name: z.string().min(1).max(70).describe('Beneficiary name (payment recipient)'),
	iban: z
		.string()
		.min(15)
		.max(34)
		.refine((val) => ibanRegex.test(val.replace(/\s/g, '').toUpperCase()), {
			message: 'Invalid IBAN format',
		})
		.describe('IBAN of the beneficiary (e.g. "DE89370400440532013000")'),
	bic: z
		.string()
		.regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i, 'Invalid BIC/SWIFT format')
		.optional()
		.describe('BIC/SWIFT code of the beneficiary bank'),
	amount: z.number().min(0.01).max(999999999.99).optional().describe('Payment amount in EUR'),
	purpose: z.string().max(140).optional().describe('Payment reference or purpose text'),
});

export type TEpcInput = z.infer<typeof EpcInputSchema>;

// All content types as a constant array (single source of truth)
export const ALL_QR_CODE_CONTENT_TYPES = [
	'url',
	'text',
	'wifi',
	'vCard',
	'email',
	'location',
	'event',
	'epc',
	// 'socials',
] as const;

// Alle Typen als Literal-Union
export const QrCodeContentType = z.enum(ALL_QR_CODE_CONTENT_TYPES);
export type TQrCodeContentType = z.infer<typeof QrCodeContentType>;

const ContentSchemas = {
	url: UrlInputSchema,
	text: TextInputSchema,
	wifi: WifiInputSchema,
	vCard: VCardInputSchema,
	email: EmailInputSchema,
	location: LocationInputSchema,
	event: EventInputSchema,
	epc: EpcInputSchema,
	// socials: SocialInputSchema,
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
	createContentSchema('epc'),
	// createContentSchema('socials'),
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
	rotation: z.number().nullable(),
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
	width: z.number().min(0).describe('QR code width in pixels'),
	height: z.number().min(0).describe('QR code height in pixels'),
	margin: z.number().min(0).describe('Quiet zone margin around the QR code in pixels'),
	image: z
		.string()
		.optional()
		.refine((value) => {
			if (!value) return true;
			const base64 = value.includes(',') ? value.split(',', 2)[1]! : value;
			const normalized = base64.replace(/\s/g, '');
			const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
			const bytes = Math.floor((normalized.length * 3) / 4) - padding;
			return bytes <= 1 * 1024 * 1024;
		}, 'Image is too large! Max size is 1 MB.')
		.describe('Base64-encoded logo image to embed in the center of the QR code. Max size 1 MB.'),
	imageOptions: z
		.object({
			hideBackgroundDots: z
				.boolean()
				.describe('Whether to hide QR code dots behind the embedded logo image'),
		})
		.describe('Options for the embedded logo image'),
	dotsOptions: z
		.object({
			type: DotType.describe(
				'Shape style of the QR code data dots: dots, rounded, classy, classy-rounded, square, or extra-rounded',
			),
			style: ColorOrGradient.describe('Color or gradient for the data dots'),
		})
		.describe('Styling for the QR code data dots'),
	cornersSquareOptions: z
		.object({
			type: CornerSquareType.describe(
				'Shape style of the corner squares: dot, square, or extra-rounded',
			),
			style: ColorOrGradient.describe('Color or gradient for the corner squares'),
		})
		.describe('Styling for the three corner squares (finder patterns)'),
	cornersDotOptions: z
		.object({
			type: CornerDotType.describe('Shape style of the corner dots: dot or square'),
			style: ColorOrGradient.describe('Color or gradient for the corner dots'),
		})
		.describe('Styling for the dots inside the corner squares'),
	backgroundOptions: z
		.object({
			style: ColorOrGradient.describe('Background color or gradient'),
		})
		.describe('QR code background styling'),
});

export type TQrCodeOptions = z.infer<typeof QrCodeOptionsSchema>;

export const QrCodeSchema = AbstractEntitySchema.extend({
	name: z
		.string()
		.max(32)
		.nullable()
		.describe('User-defined name for the QR code (max 32 characters)'),
	config: QrCodeOptionsSchema.describe(
		'QR code visual styling configuration (colors, shapes, dimensions, embedded image)',
	),
	content: QrCodeContent.describe(
		'QR code content as a discriminated union — the "type" field determines which data schema applies',
	),
	qrCodeData: z.string().nullable().describe('Raw data string encoded in the QR code'),
	previewImage: z.string().nullable().describe('URL to a preview image of the rendered QR code'),
	createdBy: z.string().nullable().describe('User ID of the QR code owner'),
});

export type TQrCode = z.infer<typeof QrCodeSchema>;
