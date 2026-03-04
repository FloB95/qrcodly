'use client';

import type { TProviderType } from '@shared/schemas';

interface ProviderLogoProps {
	providerType: TProviderType;
	className?: string;
}

function GoogleAnalyticsLogo({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 48 48"
			className={className}
			aria-label="Google Analytics"
		>
			<path
				fill="#F57C00"
				d="M42 37.2c0 2.43-1.97 4.8-4.4 4.8-2.43 0-4.4-2.37-4.4-4.8V10.8c0-2.43 1.97-4.8 4.4-4.8 2.43 0 4.4 2.37 4.4 4.8v26.4z"
			/>
			<path
				fill="#FFA726"
				d="M10.4 42c-2.43 0-4.4-1.97-4.4-4.4 0-2.43 1.97-4.4 4.4-4.4s4.4 1.97 4.4 4.4c0 2.43-1.97 4.4-4.4 4.4z"
			/>
			<path
				fill="#F57C00"
				d="M28.8 37.2c0 2.43-1.97 4.8-4.4 4.8-2.43 0-4.4-2.37-4.4-4.8V24c0-2.43 1.97-4.8 4.4-4.8 2.43 0 4.4 2.37 4.4 4.8v13.2z"
			/>
		</svg>
	);
}

function MatomoLogo({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 48 48"
			className={className}
			aria-label="Matomo"
		>
			<path
				fill="#3152A0"
				d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z"
			/>
			<path
				fill="#fff"
				d="M34.5 30.5c-1.38 0-2.5-1.12-2.5-2.5V20c0-1.38 1.12-2.5 2.5-2.5S37 18.62 37 20v8c0 1.38-1.12 2.5-2.5 2.5zm-7 2c-1.38 0-2.5-1.12-2.5-2.5V18c0-1.38 1.12-2.5 2.5-2.5S30 16.62 30 18v12c0 1.38-1.12 2.5-2.5 2.5zm-7-2c-1.38 0-2.5-1.12-2.5-2.5V20c0-1.38 1.12-2.5 2.5-2.5S23 18.62 23 20v8c0 1.38-1.12 2.5-2.5 2.5zm-7 2c-1.38 0-2.5-1.12-2.5-2.5V18c0-1.38 1.12-2.5 2.5-2.5S16 16.62 16 18v12c0 1.38-1.12 2.5-2.5 2.5z"
			/>
		</svg>
	);
}

export function ProviderLogo({ providerType, className = 'size-8' }: ProviderLogoProps) {
	if (providerType === 'google_analytics') {
		return <GoogleAnalyticsLogo className={className} />;
	}
	return <MatomoLogo className={className} />;
}
