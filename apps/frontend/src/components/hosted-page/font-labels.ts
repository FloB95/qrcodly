import type { THostedPageFont } from '@shared/schemas';

/** Human-readable names for the editor's font picker. */
export const HOSTED_FONT_LABELS: Record<THostedPageFont, { display: string; body: string }> = {
	playfair: { display: 'Playfair Display', body: 'Source Sans 3' },
	fraunces: { display: 'Fraunces', body: 'DM Sans' },
	lora: { display: 'Lora', body: 'Nunito Sans' },
	grotesk: { display: 'Space Grotesk', body: 'IBM Plex Sans' },
	manrope: { display: 'Manrope', body: 'Manrope' },
	inter: { display: 'Inter', body: 'Inter' },
	cormorant: { display: 'Cormorant Garamond', body: 'Mulish' },
	dmserif: { display: 'DM Serif Display', body: 'DM Sans' },
	outfit: { display: 'Outfit', body: 'Inter' },
	montserrat: { display: 'Montserrat', body: 'Open Sans' },
};
