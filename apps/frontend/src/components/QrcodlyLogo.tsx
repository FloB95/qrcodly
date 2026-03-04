export function QrcodlyLogo({
	size = 'default',
	showText = true,
}: {
	size?: 'sm' | 'default' | 'lg';
	showText?: boolean;
}) {
	const iconSize = size === 'sm' ? 22 : size === 'lg' ? 34 : 28;
	const textClass =
		size === 'sm'
			? 'text-lg font-bold'
			: size === 'lg'
				? 'text-xl sm:text-3xl font-bold'
				: 'text-xl font-bold';

	return (
		<span className="inline-flex items-center gap-2">
			<svg
				width={iconSize}
				height={iconSize}
				viewBox="0 0 32 32"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				{/* Top-left finder pattern */}
				<rect x="1" y="1" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
				<rect x="4.5" y="4.5" width="5" height="5" rx="1.2" fill="currentColor" />

				{/* Top-right finder pattern */}
				<rect x="19" y="1" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
				<rect x="22.5" y="4.5" width="5" height="5" rx="1.2" fill="currentColor" />

				{/* Bottom-left finder pattern */}
				<rect x="1" y="19" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
				<rect x="4.5" y="22.5" width="5" height="5" rx="1.2" fill="currentColor" />

				{/* Data modules - stylized pattern */}
				<rect x="15" y="15" width="4" height="4" rx="1" fill="currentColor" />
				<rect x="21" y="15" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
				<rect x="27" y="15" width="4" height="4" rx="1" fill="currentColor" opacity="0.5" />

				<rect x="15" y="21" width="4" height="4" rx="1" fill="currentColor" opacity="0.5" />
				<rect x="21" y="21" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />

				<rect x="15" y="27" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
				<rect x="27" y="21" width="4" height="4" rx="1" fill="currentColor" />
				<rect x="27" y="27" width="4" height="4" rx="1" fill="currentColor" opacity="0.4" />
			</svg>
			{showText && <span className={textClass}>QRcodly</span>}
		</span>
	);
}
