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
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export function AnalyticsHeroMockup() {
	const bars = [45, 60, 50, 75, 55, 85, 70, 90, 65, 95, 80, 88];
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Analytics Dashboard</span>
				</div>

				<div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Scans</div>
						<div className="text-sm sm:text-lg font-bold text-slate-900">12.4K</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+18%</div>
					</div>
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Clicks</div>
						<div className="text-sm sm:text-lg font-bold text-slate-900">8.7K</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+12%</div>
					</div>
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Visitors</div>
						<div className="text-sm sm:text-lg font-bold text-slate-900">6.2K</div>
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
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Real-Time Insights</span>
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
									<div className="text-[10px] sm:text-xs text-slate-400">{metric.label}</div>
									<div className="text-xs sm:text-sm font-semibold text-slate-900">
										{metric.value}
									</div>
								</div>
								<span className="text-[9px] sm:text-[10px] text-slate-500">{metric.detail}</span>
							</div>
						</motion.div>
					))}
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
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ArrowsRightLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Integrations</span>
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
									<div className="text-[10px] sm:text-xs font-medium text-slate-700">
										{provider.name}
									</div>
									<div className="text-[9px] sm:text-[10px] font-mono text-slate-400 truncate">
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
