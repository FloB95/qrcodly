'use client';

/**
 * Professional document header that only appears in printed/PDF output.
 * Inspired by Hetzner's AVV cover page style.
 */
export default function PrintHeader() {
	return (
		<div className="hidden print:block mb-14">
			{/* Logo aligned left */}
			<div className="flex justify-start">
				<span className="inline-flex items-center gap-2.5">
					<svg
						width={42}
						height={42}
						viewBox="0 0 32 32"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<rect x="1" y="1" width="12" height="12" rx="2.5" stroke="black" strokeWidth="2" />
						<rect x="4.5" y="4.5" width="5" height="5" rx="1.2" fill="black" />
						<rect x="19" y="1" width="12" height="12" rx="2.5" stroke="black" strokeWidth="2" />
						<rect x="22.5" y="4.5" width="5" height="5" rx="1.2" fill="black" />
						<rect x="1" y="19" width="12" height="12" rx="2.5" stroke="black" strokeWidth="2" />
						<rect x="4.5" y="22.5" width="5" height="5" rx="1.2" fill="black" />
						<rect x="15" y="15" width="4" height="4" rx="1" fill="black" />
						<rect x="21" y="15" width="4" height="4" rx="1" fill="black" opacity="0.7" />
						<rect x="27" y="15" width="4" height="4" rx="1" fill="black" opacity="0.5" />
						<rect x="15" y="21" width="4" height="4" rx="1" fill="black" opacity="0.5" />
						<rect x="21" y="21" width="4" height="4" rx="1" fill="black" opacity="0.7" />
						<rect x="15" y="27" width="4" height="4" rx="1" fill="black" opacity="0.7" />
						<rect x="27" y="21" width="4" height="4" rx="1" fill="black" />
						<rect x="27" y="27" width="4" height="4" rx="1" fill="black" opacity="0.4" />
					</svg>
					<span className="text-3xl font-bold tracking-tight">QRcodly</span>
				</span>
			</div>
		</div>
	);
}
