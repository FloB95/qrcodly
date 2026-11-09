import { z } from 'zod';
import { safeHttpUrl } from './SafeUrl';

/** Page kinds QRcodly serves itself instead of redirecting the scanner elsewhere. */
export const HOSTED_PAGE_TYPES = ['pdf'] as const;
export const HostedPageTypeSchema = z.enum(HOSTED_PAGE_TYPES);
export type THostedPageType = z.infer<typeof HostedPageTypeSchema>;

export const HOSTED_UPLOAD_KINDS = ['pdf', 'image'] as const;
export const HostedUploadKindSchema = z.enum(HOSTED_UPLOAD_KINDS);
export type THostedUploadKind = z.infer<typeof HostedUploadKindSchema>;

export const HOSTED_PAGE_DEFAULT_PRIMARY_COLOR = '#0f766e';

/** Curated looks: each fixes type pairing, corner radius and button shape so pages stay coherent. */
export const HOSTED_PAGE_STYLES = ['editorial', 'gallery', 'technical'] as const;
export const HostedPageStyleSchema = z.enum(HOSTED_PAGE_STYLES);
export type THostedPageStyle = z.infer<typeof HostedPageStyleSchema>;

export const HOSTED_PAGE_MODES = ['light', 'dark'] as const;
export const HostedPageModeSchema = z.enum(HOSTED_PAGE_MODES);
export type THostedPageMode = z.infer<typeof HostedPageModeSchema>;

/** Curated display + body pairings. A set, not a free list, so every page keeps a working type scale. */
export const HOSTED_PAGE_FONTS = [
	'playfair',
	'fraunces',
	'lora',
	'grotesk',
	'manrope',
	'inter',
	'cormorant',
	'dmserif',
	'outfit',
	'montserrat',
] as const;
export const HostedPageFontSchema = z.enum(HOSTED_PAGE_FONTS);
export type THostedPageFont = z.infer<typeof HostedPageFontSchema>;

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const HostedPageThemeSchema = z.object({
	primaryColor: hexColor.describe('Primary color as a hex value: buttons, accents, page tint'),
	accentColor: hexColor
		.optional()
		.describe(
			'Optional second color for secondary buttons and details; defaults to the primary color',
		),
	style: HostedPageStyleSchema.optional().describe(
		'Look of the page: "editorial" (default; serif headlines, full-bleed cover, for menus and hospitality), "gallery" (framed cover, document cards, for exposés and brochures), "technical" (compact rows, for manuals and data sheets)',
	),
	mode: HostedPageModeSchema.optional().describe('"light" (default) or "dark" background'),
	font: HostedPageFontSchema.optional().describe(
		"Font pairing: playfair (Playfair Display + Source Sans), fraunces (Fraunces + DM Sans), lora (Lora + Nunito Sans), grotesk (Space Grotesk + IBM Plex Sans), manrope, inter. Defaults to the style's pairing",
	),
});
export type THostedPageTheme = z.infer<typeof HostedPageThemeSchema>;

/**
 * What a style looks like before the owner touches a colour. Picking a style in the editor applies
 * these, so the first preview already looks finished.
 */
export const HOSTED_PAGE_STYLE_PRESETS: Record<
	THostedPageStyle,
	{ primaryColor: string; accentColor: string; font: THostedPageFont; mode: THostedPageMode }
> = {
	editorial: { primaryColor: '#7a3b12', accentColor: '#b8862b', font: 'playfair', mode: 'light' },
	gallery: { primaryColor: '#1e3a5f', accentColor: '#c9a227', font: 'fraunces', mode: 'light' },
	technical: { primaryColor: '#1f2937', accentColor: '#0ea5e9', font: 'grotesk', mode: 'light' },
};

export function getStylePresetTheme(style: THostedPageStyle): THostedPageTheme {
	const preset = HOSTED_PAGE_STYLE_PRESETS[style];
	return { ...preset, style };
}

/** Shared head of every hosted landing page: who it is from and what it is about. */
export const HostedPageHeaderSchema = z.object({
	title: z.string().min(1).max(120).describe('Headline of the page'),
	description: z.string().max(500).optional().describe('Short text under the headline'),
	brandName: z
		.string()
		.max(80)
		.optional()
		.describe('Company or brand name shown above the headline'),
	coverKey: z
		.string()
		.max(255)
		.optional()
		.describe('Storage key of the cover image shown at the top (upload kind "image")'),
	logoKey: z
		.string()
		.max(255)
		.optional()
		.describe('Storage key of a small logo shown with the brand name (upload kind "image")'),
});
export type THostedPageHeader = z.infer<typeof HostedPageHeaderSchema>;

/** Settings every hosted page shares. Pro-only options are stored for everyone but only honoured for Pro owners. */
export const HostedPageSettingsSchema = z.object({
	theme: HostedPageThemeSchema.optional().describe('Custom page colors (Pro plan)'),
	hideBranding: z
		.boolean()
		.optional()
		.describe(
			'Hide the "Made with QRcodly" footer. Only honoured while the owner is on the Pro plan',
		),
});
export type THostedPageSettings = z.infer<typeof HostedPageSettingsSchema>;

export const HOSTED_PDF_MAX_DOCUMENTS = 10;

/** What a scan opens: the landing page, or the first document straight away. */
export const HOSTED_PDF_OPEN_MODES = ['page', 'direct'] as const;
export const HostedPdfOpenModeSchema = z.enum(HOSTED_PDF_OPEN_MODES);
export type THostedPdfOpenMode = z.infer<typeof HostedPdfOpenModeSchema>;

export const HostedPdfDocumentSchema = z.object({
	id: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z0-9_-]+$/)
		.optional()
		.describe(
			'Stable id of the document. Keep it when you replace the file, so links, the direct-open target and later versions stay with the document. Generated when omitted',
		),
	title: z
		.string()
		.max(80)
		.optional()
		.describe('Name shown for this document, e.g. "Wine list". Falls back to the file name'),
	fileKey: z
		.string()
		.min(1)
		.max(255)
		.describe('Storage key returned by POST /hosted-page/upload (kind "pdf")'),
	fileName: z
		.string()
		.min(1)
		.max(255)
		.describe("Original file name, used for downloads. Replaced by the uploaded file's name"),
	fileSize: z.number().int().nonnegative().describe('File size in bytes, taken from the upload'),
});
export type THostedPdfDocument = z.infer<typeof HostedPdfDocumentSchema>;

export const HostedPageLinkSchema = z.object({
	label: z.string().min(1).max(40).describe('Button text, e.g. "Book a table"'),
	url: safeHttpUrl(500).describe(
		'Where the button leads (http or https, no credentials); required together with the label',
	),
});
export type THostedPageLink = z.infer<typeof HostedPageLinkSchema>;

/**
 * A PDF page is a small landing page around one or more documents: a menu with wine list and
 * lunch specials, a property exposé with floor plan, a product manual with data sheet.
 */
export const PdfPageDataSchema = HostedPageSettingsSchema.extend({
	...HostedPageHeaderSchema.shape,
	buttonLabel: z
		.string()
		.max(40)
		.optional()
		.describe('Text of the main button when the page holds a single document, e.g. "View menu"'),
	link: HostedPageLinkSchema.optional().describe('Optional secondary button leading to a URL'),
	openMode: HostedPdfOpenModeSchema.optional().describe(
		'"page" (default) shows the landing page; "direct" opens the single document right away when scanned, without a landing page',
	),
	documents: z
		.array(HostedPdfDocumentSchema)
		.min(1)
		.max(HOSTED_PDF_MAX_DOCUMENTS)
		.refine(
			(documents) => {
				const ids = documents.map((document) => document.id).filter(Boolean);
				return new Set(ids).size === ids.length;
			},
			{ message: 'Document ids must be unique within a page' },
		)
		.describe('The PDF documents offered on the page, in display order'),
});
export type TPdfPageData = z.infer<typeof PdfPageDataSchema>;

/** PDF content of a QR code: the page data plus the dynamic flag the QR code needs. */
export const PdfInputSchema = PdfPageDataSchema.extend({
	isDynamic: z
		.literal(true)
		.default(true)
		.describe('Hosted pages are always dynamic: the QR code points to a short URL'),
});
export type TPdfInput = z.infer<typeof PdfInputSchema>;

/**
 * Landing page templates, the hosted-page counterpart of the QR code design templates: one per
 * use case, applying a style, colours, font and button wording in one tap. Labels live in the
 * frontend dictionaries under `generator.contentSwitch.hosted.templates.<id>`.
 */
export const HOSTED_PAGE_TEMPLATES = [
	{
		id: 'restaurantMenu',
		type: 'pdf',
		style: 'editorial',
		theme: { primaryColor: '#7a3b12', accentColor: '#b8862b', font: 'playfair', mode: 'light' },
	},
	{
		id: 'cafeBar',
		type: 'pdf',
		style: 'editorial',
		theme: { primaryColor: '#1f2a24', accentColor: '#d4a85a', font: 'lora', mode: 'dark' },
	},
	{
		id: 'realEstate',
		type: 'pdf',
		style: 'gallery',
		theme: { primaryColor: '#1e3a5f', accentColor: '#c9a227', font: 'fraunces', mode: 'light' },
	},
	{
		id: 'brochure',
		type: 'pdf',
		style: 'gallery',
		theme: { primaryColor: '#3b2a64', accentColor: '#e05a78', font: 'manrope', mode: 'light' },
	},
	{
		id: 'eventProgram',
		type: 'pdf',
		style: 'editorial',
		theme: { primaryColor: '#0f172a', accentColor: '#f59e0b', font: 'grotesk', mode: 'dark' },
	},
	{
		id: 'productManual',
		type: 'pdf',
		style: 'technical',
		theme: { primaryColor: '#1f2937', accentColor: '#0ea5e9', font: 'grotesk', mode: 'light' },
	},
	{
		id: 'priceList',
		type: 'pdf',
		style: 'technical',
		theme: { primaryColor: '#14532d', accentColor: '#16a34a', font: 'inter', mode: 'light' },
	},
] as const satisfies ReadonlyArray<{
	id: string;
	/** The page type the template's content and wording are made for; the theme works for all */
	type: THostedPageType;
	style: THostedPageStyle;
	theme: Omit<THostedPageTheme, 'style'>;
}>;
export type THostedPageTemplateId = (typeof HOSTED_PAGE_TEMPLATES)[number]['id'];
export type THostedPageTemplate = (typeof HOSTED_PAGE_TEMPLATES)[number];

export function getTemplatesForType(type: THostedPageType): THostedPageTemplate[] {
	return HOSTED_PAGE_TEMPLATES.filter((template) => template.type === type);
}

export function getTemplateTheme(id: THostedPageTemplateId): THostedPageTheme {
	const template = HOSTED_PAGE_TEMPLATES.find((entry) => entry.id === id)!;
	return { ...template.theme, style: template.style };
}
