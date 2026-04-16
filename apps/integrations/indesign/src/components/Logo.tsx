export function Logo({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-label="QRcodly"
		>
			<rect x="1" y="1" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
			<rect x="4.5" y="4.5" width="5" height="5" rx="1.2" fill="currentColor" />
			<rect x="19" y="1" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
			<rect x="22.5" y="4.5" width="5" height="5" rx="1.2" fill="currentColor" />
			<rect x="1" y="19" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
			<rect x="4.5" y="22.5" width="5" height="5" rx="1.2" fill="currentColor" />
			<rect x="15" y="15" width="4" height="4" rx="1" fill="currentColor" />
			<rect x="21" y="15" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
			<rect x="27" y="15" width="4" height="4" rx="1" fill="currentColor" opacity="0.5" />
			<rect x="15" y="21" width="4" height="4" rx="1" fill="currentColor" opacity="0.5" />
			<rect x="21" y="21" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
			<rect x="15" y="27" width="4" height="4" rx="1" fill="currentColor" opacity="0.7" />
			<rect x="27" y="21" width="4" height="4" rx="1" fill="currentColor" />
			<rect x="27" y="27" width="4" height="4" rx="1" fill="currentColor" opacity="0.4" />
		</svg>
	);
}

export function BrandHeader() {
	return (
		<div className="brand">
			<Logo size={18} />
			<span>QRcodly</span>
		</div>
	);
}
