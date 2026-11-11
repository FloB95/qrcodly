import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { env } from '@/env';
import type { THostedPageTheme } from '@shared/schemas';
// aliased to an empty shim in the desktop app and the extension, which have no next/font
import { hostedFontVariables } from '@/components/hosted-page/fonts';
import { resolveHostedTheme, STYLE_TOKENS } from './theme';

type HostedPageShellProps = {
	theme: THostedPageTheme;
	showBranding: boolean;
	/** Inside the editor and dashboard the page renders in a phone frame and must not navigate. */
	preview?: boolean;
	wide?: boolean;
	children: ReactNode;
};

/**
 * The owner's colours tint the whole screen and the chosen preset sets type and shapes, so the
 * page reads as theirs before a single word is read. Everything below is driven by CSS variables.
 */
export function HostedPageShell({
	theme,
	showBranding,
	preview,
	wide,
	children,
}: HostedPageShellProps) {
	const t = useTranslations('hostedPage');
	const resolved = resolveHostedTheme(theme);
	const tokens = STYLE_TOKENS[resolved.style];

	return (
		<div
			data-hp-style={resolved.style}
			data-hp-mode={resolved.mode}
			data-hp-font={resolved.font}
			className={cn(
				// owners type anything: an endless word wraps instead of pushing the page sideways
				'@container flex flex-1 flex-col items-center bg-[var(--hp-bg)] font-hp-body text-[var(--hp-text)] antialiased [overflow-wrap:anywhere]',
				hostedFontVariables,
				resolved.fontClass,
				preview
					? 'min-h-full w-full px-3 pt-12 pb-8'
					: 'min-h-screen w-full px-4 pt-5 pb-28 sm:px-6 sm:pt-12 sm:pb-16',
			)}
			style={resolved.vars}
		>
			<div className={cn('w-full min-w-0', wide && !preview ? 'max-w-3xl' : 'max-w-md')}>
				{children}
			</div>
			{showBranding && (
				<footer className="mt-10 flex flex-col items-center gap-2 text-center text-xs text-[var(--hp-text-muted)]">
					<a
						href={`${env.NEXT_PUBLIC_FRONTEND_URL}/?utm_source=hosted-page&utm_medium=branding`}
						className={cn(
							'inline-flex items-center gap-1.5 bg-[var(--hp-surface)] px-3 py-1.5 shadow-sm ring-1 ring-black/5 hover:text-[var(--hp-text)]',
							tokens.radius,
						)}
						rel="noopener"
					>
						<span
							className="inline-block size-2 rounded-sm bg-[var(--hp-primary)]"
							aria-hidden="true"
						/>
						{t('madeWith')} <span className="font-semibold">QRcodly</span>
					</a>
					<a
						href={`${env.NEXT_PUBLIC_FRONTEND_URL}/?utm_source=hosted-page&utm_medium=cta`}
						className="underline-offset-2 hover:underline"
						rel="noopener"
					>
						{t('createOwn')}
					</a>
				</footer>
			)}
		</div>
	);
}
