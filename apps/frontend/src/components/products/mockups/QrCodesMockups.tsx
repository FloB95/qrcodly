'use client';

import {
	QrCodeIcon,
	SwatchIcon,
	ChartBarIcon,
	LinkIcon,
	DocumentTextIcon,
	WifiIcon,
	IdentificationIcon,
	EnvelopeIcon,
	MapPinIcon,
	CalendarIcon,
	BanknotesIcon,
	ShareIcon,
	Squares2X2Icon,
	ArrowPathIcon,
	RectangleStackIcon,
	DocumentDuplicateIcon,
	ArrowUpTrayIcon,
	CommandLineIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export function QrCodesHeroMockup() {
	return (
		<div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div className="flex items-center gap-2">
						<QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
						<span className="text-xs sm:text-sm font-medium text-slate-600">QR Code Generator</span>
					</div>
					<span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-emerald-700">
						Dynamic
					</span>
				</div>

				<div className="flex-1 flex items-center justify-center gap-4 sm:gap-6">
					<motion.div
						className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex-shrink-0"
						initial={{ scale: 0.8, opacity: 0 }}
						whileInView={{ scale: 1, opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
					>
						<div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-0.5">
							{Array.from({ length: 25 }).map((_, i) => (
								<div
									key={i}
									className={`rounded-[1px] ${
										[0, 1, 2, 4, 5, 6, 10, 14, 15, 16, 18, 19, 20, 22, 24].includes(i)
											? 'bg-white'
											: 'bg-slate-700'
									}`}
								/>
							))}
						</div>
					</motion.div>

					<div className="flex flex-col gap-2 sm:gap-3">
						<motion.div
							className="bg-slate-50 rounded-lg p-2 sm:p-3"
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.2 }}
						>
							<div className="flex items-center gap-1.5 mb-1">
								<SwatchIcon className="h-3 w-3 text-slate-400" />
								<span className="text-[10px] sm:text-xs text-slate-400">Style</span>
							</div>
							<div className="flex gap-1">
								<div className="w-4 h-4 rounded-full bg-slate-900" />
								<div className="w-4 h-4 rounded-full bg-blue-600" />
								<div className="w-4 h-4 rounded-full bg-emerald-600" />
							</div>
						</motion.div>
						<motion.div
							className="bg-amber-50 rounded-lg p-2 sm:p-3 border border-amber-200"
							initial={{ opacity: 0, x: 20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.35 }}
						>
							<div className="text-[10px] sm:text-xs text-amber-700 font-medium">
								Fully customizable
							</div>
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
}

// 21x21 QR code data modules (Version 1) — every filled cell outside the three 7×7 finder regions
const QR_DATA: [number, number][] = [
	// Rows 0-6: cols 7-13 (between top finders)
	[8, 0],
	[10, 0],
	[12, 0],
	[9, 1],
	[11, 1],
	[12, 1],
	[8, 2],
	[9, 2],
	[12, 2],
	[9, 3],
	[10, 3],
	[8, 4],
	[10, 4],
	[11, 4],
	[11, 5],
	[12, 5],
	[8, 6],
	[10, 6],
	[12, 6],
	// Row 7 (separator row)
	[9, 7],
	[11, 7],
	// Rows 8-12 (full-width data area)
	[0, 8],
	[2, 8],
	[5, 8],
	[6, 8],
	[8, 8],
	[10, 8],
	[11, 8],
	[13, 8],
	[15, 8],
	[16, 8],
	[18, 8],
	[20, 8],
	[1, 9],
	[2, 9],
	[4, 9],
	[7, 9],
	[9, 9],
	[12, 9],
	[14, 9],
	[17, 9],
	[19, 9],
	[0, 10],
	[3, 10],
	[4, 10],
	[6, 10],
	[8, 10],
	[10, 10],
	[11, 10],
	[13, 10],
	[14, 10],
	[16, 10],
	[19, 10],
	[20, 10],
	[1, 11],
	[3, 11],
	[5, 11],
	[7, 11],
	[9, 11],
	[12, 11],
	[13, 11],
	[15, 11],
	[17, 11],
	[20, 11],
	[0, 12],
	[2, 12],
	[3, 12],
	[6, 12],
	[8, 12],
	[10, 12],
	[12, 12],
	[14, 12],
	[15, 12],
	[18, 12],
	[19, 12],
	// Row 13 (separator row)
	[8, 13],
	[10, 13],
	[11, 13],
	[14, 13],
	[16, 13],
	[19, 13],
	// Rows 14-20: cols 7-20 (right of bottom-left finder)
	[9, 14],
	[12, 14],
	[13, 14],
	[15, 14],
	[17, 14],
	[18, 14],
	[20, 14],
	[8, 15],
	[10, 15],
	[13, 15],
	[15, 15],
	[16, 15],
	[19, 15],
	[9, 16],
	[10, 16],
	[11, 16],
	[14, 16],
	[16, 16],
	[18, 16],
	[20, 16],
	[8, 17],
	[11, 17],
	[12, 17],
	[15, 17],
	[17, 17],
	[18, 17],
	[8, 18],
	[9, 18],
	[12, 18],
	[13, 18],
	[16, 18],
	[19, 18],
	[20, 18],
	[10, 19],
	[11, 19],
	[14, 19],
	[15, 19],
	[17, 19],
	[19, 19],
	[8, 20],
	[10, 20],
	[12, 20],
	[14, 20],
	[16, 20],
	[18, 20],
	[20, 20],
];

const FINDER_POSITIONS = [
	{ x: 0, y: 0 },
	{ x: 14, y: 0 },
	{ x: 0, y: 14 },
];

type FinderStyle = 'square' | 'rounded' | 'circle';
type DotShape = 'square' | 'circle' | 'diamond' | 'rounded';

function renderFinder(fx: number, fy: number, style: FinderStyle, color: string) {
	const cx = fx + 3.5;
	const cy = fy + 3.5;
	if (style === 'circle') {
		return (
			<g key={`f-${fx}-${fy}`}>
				<circle cx={cx} cy={cy} r={3.5} fill={color} />
				<circle cx={cx} cy={cy} r={2.4} fill="white" />
				<circle cx={cx} cy={cy} r={1.5} fill={color} />
			</g>
		);
	}
	const outerRx = style === 'rounded' ? 1.4 : 0;
	const innerRx = style === 'rounded' ? 0.8 : 0;
	const coreRx = style === 'rounded' ? 0.5 : 0;
	return (
		<g key={`f-${fx}-${fy}`}>
			<rect x={fx} y={fy} width={7} height={7} rx={outerRx} fill={color} />
			<rect x={fx + 1} y={fy + 1} width={5} height={5} rx={innerRx} fill="white" />
			<rect x={fx + 2} y={fy + 2} width={3} height={3} rx={coreRx} fill={color} />
		</g>
	);
}

function renderDot(x: number, y: number, shape: DotShape, color: string) {
	const cx = x + 0.5;
	const cy = y + 0.5;
	if (shape === 'circle') {
		return <circle key={`${x}-${y}`} cx={cx} cy={cy} r={0.43} fill={color} />;
	}
	if (shape === 'diamond') {
		return (
			<rect
				key={`${x}-${y}`}
				x={x + 0.14}
				y={y + 0.14}
				width={0.72}
				height={0.72}
				transform={`rotate(45 ${cx} ${cy})`}
				fill={color}
			/>
		);
	}
	const rx = shape === 'rounded' ? 0.25 : 0;
	return (
		<rect
			key={`${x}-${y}`}
			x={x + 0.05}
			y={y + 0.05}
			width={0.9}
			height={0.9}
			rx={rx}
			fill={color}
		/>
	);
}

function MiniQrCode({
	color,
	finderColor,
	dotShape = 'square',
	finderStyle = 'square',
	hasLogo = false,
}: {
	color: string;
	finderColor?: string;
	dotShape?: DotShape;
	finderStyle?: FinderStyle;
	hasLogo?: boolean;
}) {
	const fc = finderColor ?? color;
	return (
		<svg viewBox="-0.5 -0.5 22 22" className="w-full h-full">
			{FINDER_POSITIONS.map((f) => renderFinder(f.x, f.y, finderStyle, fc))}
			{QR_DATA.map(([x, y]) => {
				if (hasLogo && x >= 8 && x <= 12 && y >= 8 && y <= 12) return null;
				return renderDot(x, y, dotShape, color);
			})}
			{hasLogo && (
				<>
					<rect x={8} y={8} width={5} height={5} rx={1} fill="white" />
					<rect x={8.6} y={8.6} width={3.8} height={3.8} rx={0.7} fill={fc} />
					<text
						x={10.5}
						y={11.3}
						textAnchor="middle"
						fill="white"
						fontSize={2.8}
						fontWeight="bold"
						fontFamily="system-ui, sans-serif"
					>
						Q
					</text>
				</>
			)}
		</svg>
	);
}

export function QrCustomizationMockup() {
	const designs: {
		color: string;
		finderColor?: string;
		label: string;
		dotShape: DotShape;
		finderStyle: FinderStyle;
		hasLogo?: boolean;
	}[] = [
		{ color: '#3e4c5e', label: 'Classic', dotShape: 'square', finderStyle: 'square' },
		{ color: '#5b7bb4', label: 'Sapphire', dotShape: 'circle', finderStyle: 'rounded' },
		{
			color: '#6b9e8a',
			label: 'Sage',
			dotShape: 'rounded',
			finderStyle: 'circle',
			hasLogo: true,
		},
		{
			color: '#887eb8',
			label: 'Lavender',
			dotShape: 'circle',
			finderStyle: 'circle',
			hasLogo: true,
		},
		{
			color: '#b87e8a',
			label: 'Rose',
			dotShape: 'diamond',
			finderStyle: 'rounded',
		},
		{
			color: '#91796b',
			label: 'Mocha',
			dotShape: 'rounded',
			finderStyle: 'rounded',
			hasLogo: true,
		},
	];

	return (
		<div className="relative bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div className="flex items-center gap-2">
						<SwatchIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
						<span className="text-xs sm:text-sm font-medium text-slate-600">Design Styles</span>
					</div>
					<span className="text-[10px] sm:text-xs text-slate-400">Fully customizable</span>
				</div>

				<div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 content-center">
					{designs.map((d, i) => (
						<motion.div
							key={d.label}
							className="flex flex-col items-center gap-1.5 sm:gap-2 bg-white rounded-xl p-2 sm:p-3 border border-slate-100 shadow-sm"
							initial={{ opacity: 0, scale: 0.8 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.08 }}
						>
							<div className="w-[60px] h-[60px] sm:w-[76px] sm:h-[76px]">
								<MiniQrCode
									color={d.color}
									finderColor={d.finderColor}
									dotShape={d.dotShape}
									finderStyle={d.finderStyle}
									hasLogo={d.hasLogo}
								/>
							</div>
							<span className="text-[8px] sm:text-[10px] font-medium text-slate-500">
								{d.label}
							</span>
						</motion.div>
					))}
				</div>

				<motion.div
					className="mt-3 bg-slate-50 rounded-lg p-2 sm:p-2.5 flex items-center justify-between"
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.5 }}
				>
					<span className="text-[10px] sm:text-xs text-slate-500">
						Colors, shapes, logos & more
					</span>
					<SwatchIcon className="h-3.5 w-3.5 text-slate-400" />
				</motion.div>
			</div>
		</div>
	);
}

export function QrScanAnalyticsMockup() {
	const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
	const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];
	const devices = [
		{ label: 'Mobile', pct: 62, color: 'bg-slate-900' },
		{ label: 'Desktop', pct: 28, color: 'bg-slate-500' },
		{ label: 'Tablet', pct: 10, color: 'bg-slate-300' },
	];
	const countries = [
		{ flag: '🇩🇪', pct: 34 },
		{ flag: '🇺🇸', pct: 22 },
		{ flag: '🇬🇧', pct: 15 },
		{ flag: '🇫🇷', pct: 11 },
	];
	const browsers = [
		{ label: 'Chrome', pct: 48 },
		{ label: 'Safari', pct: 31 },
		{ label: 'Firefox', pct: 12 },
	];
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-3 sm:p-5 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-2.5 sm:mb-3">
					<ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Scan Analytics</span>
				</div>

				{/* Scans + Visitors */}
				<div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
					<div className="bg-slate-50 rounded-lg p-1.5 sm:p-2.5">
						<div className="text-[9px] sm:text-[10px] text-slate-400">Total Scans</div>
						<div className="text-sm sm:text-base font-bold text-slate-900">2,847</div>
						<div className="text-[9px] sm:text-[10px] text-emerald-600 font-medium">+12.5%</div>
					</div>
					<div className="bg-slate-50 rounded-lg p-1.5 sm:p-2.5">
						<div className="text-[9px] sm:text-[10px] text-slate-400">Visitors</div>
						<div className="text-sm sm:text-base font-bold text-slate-900">1,523</div>
						<div className="text-[9px] sm:text-[10px] text-emerald-600 font-medium">+8.3%</div>
					</div>
				</div>

				{/* Bar chart */}
				<div className="flex flex-col flex-1 min-h-0 mb-2.5 sm:mb-3">
					<div className="flex items-end gap-[3px] sm:gap-1 flex-1 min-h-0">
						{bars.map((h, i) => (
							<div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
								<motion.div
									className="w-full bg-slate-900 rounded-t-sm"
									initial={{ height: 0 }}
									whileInView={{ height: `${h}%` }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: i * 0.05 }}
								/>
							</div>
						))}
					</div>
					<div className="flex gap-[3px] sm:gap-1 mt-1">
						{months.map((m, i) => (
							<div key={i} className="flex-1 text-center text-[7px] sm:text-[9px] text-slate-400">
								{m}
							</div>
						))}
					</div>
				</div>

				{/* Devices + Countries + Browsers */}
				<div className="grid grid-cols-3 gap-1.5 sm:gap-2">
					{/* Devices */}
					<motion.div
						className="bg-slate-50 rounded-lg p-1.5 sm:p-2"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.6 }}
					>
						<div className="text-[8px] sm:text-[10px] text-slate-400 mb-1 sm:mb-1.5">Devices</div>
						<div className="flex gap-[2px] h-1 sm:h-1.5 rounded-full overflow-hidden mb-1 sm:mb-1.5">
							{devices.map((d) => (
								<motion.div
									key={d.label}
									className={d.color}
									initial={{ width: 0 }}
									whileInView={{ width: `${d.pct}%` }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.7 }}
								/>
							))}
						</div>
						<div className="flex flex-col gap-0.5">
							{devices.map((d) => (
								<div key={d.label} className="flex items-center gap-1">
									<div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${d.color}`} />
									<span className="text-[7px] sm:text-[8px] text-slate-500 truncate">
										{d.pct}% {d.label}
									</span>
								</div>
							))}
						</div>
					</motion.div>

					{/* Countries */}
					<motion.div
						className="bg-slate-50 rounded-lg p-1.5 sm:p-2"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.7 }}
					>
						<div className="text-[8px] sm:text-[10px] text-slate-400 mb-1 sm:mb-1.5">Countries</div>
						<div className="flex flex-col gap-0.5 sm:gap-1">
							{countries.map((c) => (
								<div key={c.flag} className="flex items-center gap-1">
									<span className="text-[8px] sm:text-[10px] leading-none">{c.flag}</span>
									<div className="flex-1 h-1 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden">
										<motion.div
											className="h-full bg-slate-700 rounded-full"
											initial={{ width: 0 }}
											whileInView={{ width: `${c.pct}%` }}
											viewport={{ once: true }}
											transition={{ duration: 0.5, delay: 0.8 }}
										/>
									</div>
									<span className="text-[7px] sm:text-[8px] text-slate-500 tabular-nums">
										{c.pct}%
									</span>
								</div>
							))}
						</div>
					</motion.div>

					{/* Browsers */}
					<motion.div
						className="bg-slate-50 rounded-lg p-1.5 sm:p-2"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.8 }}
					>
						<div className="text-[8px] sm:text-[10px] text-slate-400 mb-1 sm:mb-1.5">Browsers</div>
						<div className="flex flex-col gap-0.5 sm:gap-1">
							{browsers.map((b) => (
								<div key={b.label} className="flex flex-col gap-0.5">
									<div className="flex items-center justify-between">
										<span className="text-[7px] sm:text-[8px] text-slate-600 truncate">
											{b.label}
										</span>
										<span className="text-[7px] sm:text-[8px] text-slate-400 tabular-nums">
											{b.pct}%
										</span>
									</div>
									<div className="h-1 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden">
										<motion.div
											className="h-full bg-slate-500 rounded-full"
											initial={{ width: 0 }}
											whileInView={{ width: `${b.pct}%` }}
											viewport={{ once: true }}
											transition={{ duration: 0.5, delay: 0.9 }}
										/>
									</div>
								</div>
							))}
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function QrContentTypesMockup() {
	const types = [
		{ icon: <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'URL' },
		{ icon: <DocumentTextIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'Text' },
		{ icon: <WifiIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'WiFi' },
		{ icon: <IdentificationIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'vCard' },
		{ icon: <EnvelopeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'Email' },
		{ icon: <MapPinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'Location' },
		{ icon: <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'Event' },
		{ icon: <BanknotesIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'EPC' },
		{ icon: <ShareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'Social' },
	];
	return (
		<div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-3 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-2 sm:mb-4">
					<Squares2X2Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Content Types</span>
				</div>

				<div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2.5 content-center">
					{types.map((type) => (
						<motion.div
							key={type.label}
							className="flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 bg-slate-50 rounded-lg sm:rounded-xl p-1 sm:p-2.5"
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.3 }}
						>
							<div className="text-slate-600">{type.icon}</div>
							<span className="text-[7px] sm:text-[10px] font-medium text-slate-600">
								{type.label}
							</span>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

export function QrDynamicUpdatesMockup() {
	return (
		<div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Dynamic Updates</span>
				</div>

				<div className="flex-1 flex flex-col gap-3 sm:gap-4 justify-center">
					<motion.div
						className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200/60 mb-1"
						initial={{ opacity: 0, y: -10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4 }}
					>
						<div className="text-[10px] sm:text-xs text-slate-400 mb-1">
							Short URL (stays the same)
						</div>
						<div className="text-xs sm:text-sm font-mono font-semibold text-slate-800">
							qrcodly.de/u/x7k9m
						</div>
					</motion.div>

					<motion.div
						className="bg-red-50 rounded-xl p-3 sm:p-4 border border-red-200/60"
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.15 }}
					>
						<div className="text-[10px] sm:text-xs text-red-400 mb-1">Previous destination</div>
						<div className="text-xs sm:text-sm font-mono text-red-300 line-through">
							example.com/summer-promo
						</div>
					</motion.div>

					<div className="flex justify-center">
						<motion.div
							className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center"
							initial={{ scale: 0, rotate: -180 }}
							whileInView={{ scale: 1, rotate: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: 0.3 }}
						>
							<ArrowPathIcon className="h-3.5 w-3.5 text-white" />
						</motion.div>
					</div>

					<motion.div
						className="bg-emerald-50 rounded-xl p-3 sm:p-4 border border-emerald-200"
						initial={{ opacity: 0, x: 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.45 }}
					>
						<div className="text-[10px] sm:text-xs text-emerald-500 mb-1">New destination</div>
						<div className="text-xs sm:text-sm font-mono font-semibold text-emerald-800">
							example.com/winter-sale
						</div>
					</motion.div>

					<motion.div
						className="bg-slate-50 rounded-lg p-2 sm:p-2.5 text-center"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.5 }}
					>
						<span className="text-[10px] sm:text-xs text-slate-500 font-medium">
							Same QR code — no reprinting needed
						</span>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function QrBulkTemplatesMockup() {
	const templates = [
		{ name: 'Brand Blue', colors: ['bg-blue-600', 'bg-blue-400', 'bg-blue-200'] },
		{ name: 'Sunset', colors: ['bg-orange-500', 'bg-amber-400', 'bg-yellow-300'] },
		{ name: 'Forest', colors: ['bg-emerald-600', 'bg-green-400', 'bg-lime-300'] },
	];
	return (
		<div className="relative bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<RectangleStackIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Templates & Bulk</span>
				</div>

				<div className="flex-1 flex flex-col gap-2.5 sm:gap-3">
					{templates.map((tpl, i) => (
						<motion.div
							key={tpl.name}
							className="flex items-center gap-3 bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3"
							initial={{ opacity: 0, x: -15 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.3, delay: i * 0.1 }}
						>
							<div className="flex gap-1">
								{tpl.colors.map((color) => (
									<div key={color} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${color}`} />
								))}
							</div>
							<span className="text-[10px] sm:text-xs font-medium text-slate-700">{tpl.name}</span>
							<DocumentDuplicateIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 ml-auto" />
						</motion.div>
					))}

					<motion.div
						className="bg-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-indigo-200/60 mt-auto"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.35 }}
					>
						<div className="flex items-center gap-2 mb-1.5">
							<ArrowUpTrayIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
							<span className="text-[10px] sm:text-xs font-medium text-indigo-700">
								CSV Bulk Import
							</span>
						</div>
						<div className="text-[10px] sm:text-xs text-indigo-500">
							248 QR codes created from upload
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function QrApiAccessMockup() {
	return (
		<div className="relative bg-gradient-to-br from-slate-100 to-zinc-100 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<CommandLineIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
					<span className="text-xs sm:text-sm font-medium text-slate-400">REST API</span>
					<span className="ml-auto inline-flex items-center rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-emerald-400">
						201 Created
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-2.5 sm:gap-3 font-mono text-[10px] sm:text-xs">
					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.3 }}
					>
						<span className="text-emerald-400">POST</span>
						<span className="text-slate-500"> /api/v1/qr-code</span>
					</motion.div>

					<motion.div
						className="bg-slate-800 rounded-lg p-2.5 sm:p-3"
						initial={{ opacity: 0, y: 5 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.15 }}
					>
						<div className="text-slate-500">{'{'}</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;type&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-amber-300">&quot;url&quot;</span>
						</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;url&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-amber-300">&quot;https://example.com&quot;</span>
						</div>
						<div className="text-slate-500">{'}'}</div>
					</motion.div>

					<motion.div
						className="bg-slate-800/50 rounded-lg p-2.5 sm:p-3 border border-emerald-800/30"
						initial={{ opacity: 0, y: 5 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.3 }}
					>
						<div className="text-slate-500">{'{'}</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;id&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-emerald-400">&quot;qr_8f3k...&quot;</span>
						</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;type&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-emerald-400">&quot;url&quot;</span>
						</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;imageUrl&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-emerald-400">&quot;https://cdn.qrcodly.de/...&quot;</span>
						</div>
						<div className="text-slate-500">{'}'}</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
