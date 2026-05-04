'use client';

import {
	ChartBarIcon,
	GlobeAltIcon,
	DevicePhoneMobileIcon,
	ArrowsRightLeftIcon,
	ShieldCheckIcon,
	ComputerDesktopIcon,
	MapPinIcon,
	ClockIcon,
	ArrowDownTrayIcon,
	EyeSlashIcon,
	FingerPrintIcon,
	ServerIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export function AnalyticsHeroMockup() {
	const bars = [45, 60, 50, 75, 55, 85, 70, 90, 65, 95, 80, 88];
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">
						Analytics Dashboard
					</span>
				</div>

				<div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-muted-foreground">Scans</div>
						<div className="text-sm sm:text-lg font-bold text-foreground">12.4K</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+18%</div>
					</div>
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-muted-foreground">Clicks</div>
						<div className="text-sm sm:text-lg font-bold text-foreground">8.7K</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+12%</div>
					</div>
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-muted-foreground">Visitors</div>
						<div className="text-sm sm:text-lg font-bold text-foreground">6.2K</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+9%</div>
					</div>
				</div>

				<div className="flex items-end gap-1 sm:gap-1.5 flex-1 min-h-0">
					{bars.map((h, i) => (
						<motion.div
							key={i}
							className="flex-1 bg-indigo-600 rounded-t-sm"
							initial={{ height: 0 }}
							whileInView={{ height: `${h}%` }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: i * 0.05 }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

export function RealTimeMetricsMockup() {
	const metrics = [
		{
			icon: <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />,
			label: 'Top Country',
			value: 'Germany',
			detail: '42% of traffic',
			color: 'bg-blue-100',
		},
		{
			icon: <DevicePhoneMobileIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />,
			label: 'Top Device',
			value: 'Mobile',
			detail: '68% of scans',
			color: 'bg-purple-100',
		},
		{
			icon: <ComputerDesktopIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />,
			label: 'Top Browser',
			value: 'Chrome',
			detail: '54% of visits',
			color: 'bg-amber-100',
		},
	];
	return (
		<div className="relative bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">
						Real-Time Insights
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-3 sm:gap-4">
					{metrics.map((metric, i) => (
						<motion.div
							key={metric.label}
							className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.15 }}
						>
							<div className="flex items-center gap-3">
								<div
									className={`w-9 h-9 sm:w-10 sm:h-10 ${metric.color} rounded-lg flex items-center justify-center flex-shrink-0`}
								>
									{metric.icon}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-[10px] sm:text-xs text-muted-foreground">{metric.label}</div>
									<div className="text-xs sm:text-sm font-semibold text-foreground">
										{metric.value}
									</div>
								</div>
								<span className="text-[9px] sm:text-[10px] text-muted-foreground">
									{metric.detail}
								</span>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

export function ChannelComparisonMockup() {
	const channels = [
		{ label: 'QR Codes', scans: 4218, pct: 62 },
		{ label: 'Short URLs', clicks: 2567, pct: 38 },
	];
	return (
		<div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">
						Channel Comparison
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-4 sm:gap-5 justify-center">
					{channels.map((ch, i) => (
						<motion.div
							key={ch.label}
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.15 }}
						>
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
									{ch.label}
								</span>
								<span className="text-[10px] sm:text-xs text-muted-foreground">{ch.pct}%</span>
							</div>
							<div className="h-3 bg-muted rounded-full overflow-hidden">
								<motion.div
									className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-teal-500'}`}
									initial={{ width: 0 }}
									whileInView={{ width: `${ch.pct}%` }}
									viewport={{ once: true }}
									transition={{ duration: 0.8, delay: 0.2 + i * 0.15 }}
								/>
							</div>
						</motion.div>
					))}

					<motion.div
						className="bg-emerald-50 rounded-lg p-2.5 sm:p-3 text-center"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.5 }}
					>
						<span className="text-[10px] sm:text-xs text-emerald-700 font-medium">
							6,785 total interactions this month
						</span>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function IntegrationsDashboardMockup() {
	const providers = [
		{
			name: 'Google Analytics 4',
			icon: <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />,
			color: 'bg-blue-100',
			badge: 'bg-emerald-100 text-emerald-700',
			status: 'Connected',
			detail: 'G-XXXXXXXXXX',
		},
		{
			name: 'Matomo',
			icon: <GlobeAltIcon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />,
			color: 'bg-indigo-100',
			badge: 'bg-emerald-100 text-emerald-700',
			status: 'Connected',
			detail: 'analytics.example.com',
		},
	];

	return (
		<div className="relative bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ArrowsRightLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">Integrations</span>
				</div>

				<div className="flex-1 flex flex-col gap-3 sm:gap-4">
					{providers.map((provider, i) => (
						<motion.div
							key={provider.name}
							className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.15 }}
						>
							<div className="flex items-center gap-3">
								<div
									className={`w-9 h-9 sm:w-10 sm:h-10 ${provider.color} rounded-lg flex items-center justify-center flex-shrink-0`}
								>
									{provider.icon}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-[10px] sm:text-xs font-medium text-muted-foreground">
										{provider.name}
									</div>
									<div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground truncate">
										{provider.detail}
									</div>
								</div>
								<span
									className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${provider.badge} flex-shrink-0`}
								>
									{provider.status}
								</span>
							</div>
						</motion.div>
					))}

					<motion.div
						className="flex items-center justify-center gap-1.5 bg-emerald-50 rounded-lg p-2 sm:p-2.5"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.35 }}
					>
						<ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
						<span className="text-[9px] sm:text-[10px] font-medium text-emerald-700">
							Only anonymized data shared
						</span>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function GeographicInsightsMockup() {
	const countries = [
		{ name: 'Germany', pct: 42, flag: '\u{1F1E9}\u{1F1EA}' },
		{ name: 'United States', pct: 28, flag: '\u{1F1FA}\u{1F1F8}' },
		{ name: 'United Kingdom', pct: 15, flag: '\u{1F1EC}\u{1F1E7}' },
		{ name: 'France', pct: 10, flag: '\u{1F1EB}\u{1F1F7}' },
		{ name: 'Others', pct: 5, flag: '\u{1F30D}' },
	];
	return (
		<div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">
						Geographic Insights
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-2 sm:gap-2.5">
					{countries.map((country, i) => (
						<motion.div
							key={country.name}
							className="flex items-center gap-3"
							initial={{ opacity: 0, x: -15 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.3, delay: i * 0.08 }}
						>
							<span className="text-sm sm:text-base w-6 text-center">{country.flag}</span>
							<span className="text-[10px] sm:text-xs font-medium text-muted-foreground w-24 sm:w-28">
								{country.name}
							</span>
							<div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
								<motion.div
									className="h-full bg-indigo-500 rounded-full"
									initial={{ width: 0 }}
									whileInView={{ width: `${country.pct}%` }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
								/>
							</div>
							<span className="text-[10px] sm:text-xs text-muted-foreground w-8 text-right">
								{country.pct}%
							</span>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

export function PrivacyFirstMockup() {
	const items = [
		{
			icon: <EyeSlashIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />,
			label: 'IP Address',
			raw: '192.168.42.137',
			anonymized: '192.168.42.***',
			color: 'bg-emerald-100',
		},
		{
			icon: <FingerPrintIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />,
			label: 'User Agent',
			raw: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)…',
			anonymized: 'Mobile \u00b7 iOS \u00b7 Safari',
			color: 'bg-blue-100',
		},
		{
			icon: <ServerIcon className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />,
			label: 'Location',
			raw: '48.1374, 11.5755',
			anonymized: 'Germany',
			color: 'bg-violet-100',
		},
	];

	return (
		<div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">
						Privacy Processing
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-3 sm:gap-4">
					{items.map((item, i) => (
						<motion.div
							key={item.label}
							className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.15 }}
						>
							<div className="flex items-center gap-3 mb-2">
								<div
									className={`w-8 h-8 sm:w-9 sm:h-9 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}
								>
									{item.icon}
								</div>
								<span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
									{item.label}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-[9px] sm:text-[10px] text-muted-foreground line-through truncate flex-1">
									{item.raw}
								</span>
								<span className="text-[10px] sm:text-xs text-muted-foreground">{'\u2192'}</span>
								<span className="text-[9px] sm:text-[10px] font-medium text-emerald-700 truncate flex-1 text-right">
									{item.anonymized}
								</span>
							</div>
						</motion.div>
					))}

					<motion.div
						className="flex items-center justify-center gap-1.5 bg-emerald-50 rounded-lg p-2 sm:p-2.5 mt-auto"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.5 }}
					>
						<ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
						<span className="text-[9px] sm:text-[10px] font-medium text-emerald-700">
							No personal data stored
						</span>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function ExportReportingMockup() {
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-zinc-100 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-card rounded-2xl shadow-xl border border-border/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
					<span className="text-xs sm:text-sm font-medium text-muted-foreground">
						Export & Reports
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-3 sm:gap-4">
					<motion.div
						className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.3 }}
					>
						<div className="text-[10px] sm:text-xs text-muted-foreground mb-2">Date Range</div>
						<div className="flex gap-2">
							<div className="bg-card rounded-md px-2 py-1 text-[10px] sm:text-xs text-muted-foreground border border-border">
								Mar 1, 2026
							</div>
							<span className="text-[10px] sm:text-xs text-muted-foreground self-center">
								{'\u2192'}
							</span>
							<div className="bg-card rounded-md px-2 py-1 text-[10px] sm:text-xs text-muted-foreground border border-border">
								Mar 11, 2026
							</div>
						</div>
					</motion.div>

					<motion.div
						className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.3, delay: 0.1 }}
					>
						<div className="text-[10px] sm:text-xs text-muted-foreground mb-2">Include</div>
						<div className="flex flex-wrap gap-1.5">
							{['Scans', 'Clicks', 'Devices', 'Locations'].map((item) => (
								<span
									key={item}
									className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium"
								>
									{item}
								</span>
							))}
						</div>
					</motion.div>

					<motion.div
						className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-200/60 mt-auto"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.25 }}
					>
						<div className="flex items-center gap-2">
							<ArrowDownTrayIcon className="h-4 w-4 text-emerald-600" />
							<div>
								<div className="text-[10px] sm:text-xs font-medium text-emerald-800">
									report-mar-2026.csv
								</div>
								<div className="text-[9px] sm:text-[10px] text-emerald-600">
									1,247 rows exported
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
