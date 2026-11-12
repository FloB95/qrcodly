import type { ClerkAppearanceTheme } from '@clerk/nextjs/types';

// Sign-in and sign-up cards in the look of the marketing pages (cards, inputs, primary button).
// Style objects, not Tailwind classes: Clerk's own styles are unlayered and beat our utilities.
const cardShadow = '0 24px 60px -36px rgba(15, 23, 42, 0.35)';
const field = {
	height: '2.75rem',
	borderRadius: '0.75rem',
	backgroundColor: '#ffffff',
};

export const authAppearance: ClerkAppearanceTheme = {
	variables: {
		borderRadius: '0.75rem',
		colorPrimary: '#0f172a',
		colorForeground: '#0f172a',
		colorMutedForeground: '#64748b',
		colorInput: '#ffffff',
		// Clerk mixes borders from this at low opacity: slate-900 ends up near our stone-200
		colorBorder: '#0f172a',
		colorRing: 'rgba(15, 23, 42, 0.08)',
		fontSize: '0.875rem',
	},
	elements: {
		// Clerk caps the card at 100vw - 2.5rem; use the page gutter instead, the pop-up keeps the cap
		modalContent: { maxWidth: 'calc(100vw - 2.5rem)' },
		rootBox: { maxWidth: '100%' },
		cardBox: {
			maxWidth: '100%',
			borderRadius: '22px',
			border: 'none',
			boxShadow: cardShadow,
		},
		// Flat bottom: without Clerk's card shadow, rounded corners would notch into the footer band
		card: {
			padding: '2.25rem 2rem',
			gap: '1.75rem',
			boxShadow: 'none',
			borderBottomLeftRadius: 0,
			borderBottomRightRadius: 0,
			'@media (max-width: 479px)': { padding: '1.75rem 1.25rem' },
		},
		logoBox: { display: 'none' },
		header: { alignItems: 'flex-start', textAlign: 'left' },
		headerTitle: { fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.025em' },
		headerSubtitle: { fontSize: '0.8125rem', lineHeight: 1.6, color: '#64748b' },
		socialButtonsBlockButton: {
			...field,
			'&:hover': { backgroundColor: '#fafaf9' },
		},
		socialButtonsBlockButtonText: { fontWeight: 600, color: '#0f172a' },
		formFieldLabel: { fontWeight: 500, color: '#0f172a' },
		formFieldInput: {
			...field,
			// Clerk caps inputs at 36px, which would undo the height above
			maxHeight: 'none',
			paddingInline: '0.875rem',
			// below 16px iOS Safari zooms into the page on focus
			'@media (max-width: 639px)': { fontSize: '1rem' },
		},
		// variables.borderRadius would make the consent checkbox round like a radio button,
		// and Clerk's 11% shadow outline is barely visible
		formFieldCheckboxInput: {
			width: '1rem',
			height: '1rem',
			borderRadius: '0.25rem',
			border: '1px solid #94a3b8',
		},
		formFieldCheckboxLabel: { color: '#475569', lineHeight: 1.6 },
		formButtonPrimary: {
			height: '2.75rem',
			borderRadius: '0.75rem',
			fontWeight: 600,
			backgroundImage: 'linear-gradient(to right, #0f172a, #1e293b, #0f172a)',
			boxShadow: '0 14px 30px -14px rgba(15, 23, 42, 0.7)',
			'&:hover': { backgroundImage: 'linear-gradient(to right, #1e293b, #334155, #1e293b)' },
			'&::after': { display: 'none' },
		},
		footer: { background: '#fafaf9' },
		footerAction: { flexWrap: 'wrap', justifyContent: 'center' },
		footerActionText: { color: '#475569' },
		footerActionLink: {
			fontWeight: 600,
			color: '#0f172a',
			textUnderlineOffset: '4px',
		},
	},
};
