'use client';

export const TableLoader = () => (
	<div className="absolute inset-0 z-20 flex min-h-[40vh] items-center justify-center">
		<div className="animate-fade-in rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-2.5 shadow-lg sm:rounded-xl sm:p-3">
			<svg
				className="h-8 w-8 sm:h-11 sm:w-11"
				viewBox="0 0 32 32"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Top-left finder pattern */}
				<rect
					x="1"
					y="1"
					width="12"
					height="12"
					rx="2.5"
					stroke="white"
					strokeWidth="2"
					opacity="0.9"
				/>
				<rect x="4.5" y="4.5" width="5" height="5" rx="1.2" fill="white" opacity="0.9" />

				{/* Top-right finder pattern */}
				<rect
					x="19"
					y="1"
					width="12"
					height="12"
					rx="2.5"
					stroke="white"
					strokeWidth="2"
					opacity="0.9"
				/>
				<rect x="22.5" y="4.5" width="5" height="5" rx="1.2" fill="white" opacity="0.9" />

				{/* Bottom-left finder pattern */}
				<rect
					x="1"
					y="19"
					width="12"
					height="12"
					rx="2.5"
					stroke="white"
					strokeWidth="2"
					opacity="0.9"
				/>
				<rect x="4.5" y="22.5" width="5" height="5" rx="1.2" fill="white" opacity="0.9" />

				{/* Data modules — pulsing with staggered delays */}
				<rect
					x="15"
					y="15"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '0s' }}
				/>
				<rect
					x="21"
					y="15"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '0.2s' }}
				/>
				<rect
					x="27"
					y="15"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '0.4s' }}
				/>
				<rect
					x="15"
					y="21"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '0.6s' }}
				/>
				<rect
					x="21"
					y="21"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '0.8s' }}
				/>
				<rect
					x="15"
					y="27"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '1.0s' }}
				/>
				<rect
					x="27"
					y="21"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '1.2s' }}
				/>
				<rect
					x="27"
					y="27"
					width="4"
					height="4"
					rx="1"
					fill="white"
					className="animate-qr-dot-pulse"
					style={{ animationDelay: '1.4s' }}
				/>
			</svg>
		</div>
	</div>
);
