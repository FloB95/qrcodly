'use client';

import {
	LinkIcon,
	GlobeAltIcon,
	ChartBarIcon,
	CheckIcon,
	TagIcon,
	ClipboardDocumentIcon,
	ArrowTrendingUpIcon,
	DocumentArrowUpIcon,
	CommandLineIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export function UrlShortenerHeroMockup() {
	return (
		<div className="relative bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Shorten URL</span>
				</div>

				<div className="flex-1 flex flex-col justify-center gap-4">
					<div className="bg-slate-50 rounded-xl p-3 sm:p-4">
						<div className="text-[10px] sm:text-xs text-slate-400 mb-2">Paste your long URL</div>
						<div className="text-[10px] sm:text-xs font-mono text-slate-500 break-all">
							https://example.com/very/long/marketing/campaign/url?utm_source=...
						</div>
					</div>

					<div className="flex justify-center">
						<motion.div
							className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center"
							initial={{ scale: 0.8, opacity: 0 }}
							whileInView={{ scale: 1, opacity: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.2 }}
						>
							<ArrowTrendingUpIcon className="h-4 w-4 text-white" />
						</motion.div>
					</div>

					<motion.div
						className="bg-teal-50 rounded-xl p-3 sm:p-4 border border-teal-200"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.4 }}
					>
						<div className="text-[10px] sm:text-xs text-teal-500 mb-2">Your short URL</div>
						<div className="flex items-center justify-between">
							<span className="text-xs sm:text-sm font-mono font-semibold text-teal-800">
								qrcodly.de/u/x7k9m
							</span>
							<ClipboardDocumentIcon className="h-4 w-4 text-teal-600" />
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function BrandedLinksMockup() {
	const domains = [
		{ domain: 'go.yourbrand.com', path: '/u/a3k8p', ssl: true },
		{ domain: 'link.agency.io', path: '/u/t9w2y', ssl: true },
	];
	return (
		<div className="relative bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<GlobeAltIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Branded Links</span>
				</div>

				<div className="flex-1 flex flex-col gap-3 sm:gap-4">
					{domains.map((d, i) => (
						<motion.div
							key={d.domain}
							className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.15 }}
						>
							<div className="text-xs sm:text-sm font-mono font-medium text-blue-800">
								{d.domain}
								{d.path}
							</div>
							<div className="flex items-center gap-1 mt-1.5">
								<CheckIcon className="h-3 w-3 text-emerald-500" />
								<span className="text-[9px] sm:text-[10px] text-emerald-600">SSL Active</span>
							</div>
						</motion.div>
					))}

					<motion.div
						className="bg-slate-50 rounded-xl p-3 sm:p-4 text-center"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.35 }}
					>
						<span className="text-[10px] sm:text-xs text-slate-500">
							Connect your domain in minutes
						</span>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function LinkAnalyticsMockup() {
	const bars = [35, 55, 40, 70, 50, 85, 65, 80, 55, 90, 70, 82];
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Click Analytics</span>
				</div>

				<div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Total Clicks</div>
						<div className="text-base sm:text-lg font-bold text-slate-900">4,218</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+15.2%</div>
					</div>
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Unique Visitors</div>
						<div className="text-base sm:text-lg font-bold text-slate-900">2,891</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+10.7%</div>
					</div>
				</div>

				<div className="flex items-end gap-1 sm:gap-1.5 flex-1 min-h-0">
					{bars.map((h, i) => (
						<motion.div
							key={i}
							className="flex-1 bg-teal-600 rounded-t-sm"
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

export function LinkManagementMockup() {
	const links = [
		{ short: 'qrcodly.de/u/x7k9m', status: 'Active', clicks: 1284, tag: 'Marketing' },
		{ short: 'qrcodly.de/u/b3p2q', status: 'Active', clicks: 847, tag: 'Campaign' },
		{ short: 'qrcodly.de/u/r8n4w', status: 'Active', clicks: 531, tag: 'Product' },
	];
	return (
		<div className="relative bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div className="flex items-center gap-2">
						<LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
						<span className="text-xs sm:text-sm font-medium text-slate-600">All Links</span>
					</div>
					<span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-teal-700">
						{links.length} Active
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-2 sm:gap-3">
					{links.map((link, i) => (
						<motion.div
							key={link.short}
							className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: i * 0.1 }}
						>
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-[10px] sm:text-xs font-mono font-medium text-slate-800">
									{link.short}
								</span>
								<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-emerald-700">
									<div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
									{link.status}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500">
									<TagIcon className="h-3 w-3" />
									{link.tag}
								</span>
								<span className="text-[9px] sm:text-[10px] text-slate-400">
									{link.clicks.toLocaleString('en-US')} clicks
								</span>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

export function BulkOperationsMockup() {
	const items = [
		{ url: 'qrcodly.de/u/x7k9m', status: 'created' },
		{ url: 'qrcodly.de/u/b3p2q', status: 'created' },
		{ url: 'qrcodly.de/u/r8n4w', status: 'created' },
		{ url: 'qrcodly.de/u/m5j6t', status: 'pending' },
	];
	return (
		<div className="relative bg-gradient-to-br from-cyan-50 to-sky-50 rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div className="flex items-center gap-2">
						<DocumentArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
						<span className="text-xs sm:text-sm font-medium text-slate-600">Bulk Import</span>
					</div>
					<span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-blue-700">
						4 of 248
					</span>
				</div>

				<div className="flex-1 flex flex-col gap-2 sm:gap-2.5">
					{items.map((item, i) => (
						<motion.div
							key={item.url}
							className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-2 sm:p-2.5"
							initial={{ opacity: 0, y: 10 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.3, delay: i * 0.08 }}
						>
							<div
								className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'created' ? 'bg-emerald-100' : 'bg-slate-200'}`}
							>
								{item.status === 'created' && (
									<CheckIcon className="h-2.5 w-2.5 text-emerald-600" />
								)}
							</div>
							<span className="text-[10px] sm:text-xs font-mono text-slate-700 flex-1">
								{item.url}
							</span>
							<span
								className={`text-[9px] sm:text-[10px] font-medium ${item.status === 'created' ? 'text-emerald-600' : 'text-slate-400'}`}
							>
								{item.status === 'created' ? 'Created' : 'Pending'}
							</span>
						</motion.div>
					))}
				</div>

				<motion.div
					className="mt-3 sm:mt-4"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.4 }}
				>
					<div className="flex items-center justify-between mb-1.5">
						<span className="text-[10px] sm:text-xs text-slate-500">Progress</span>
						<span className="text-[10px] sm:text-xs font-medium text-slate-700">75%</span>
					</div>
					<div className="h-2 bg-slate-100 rounded-full overflow-hidden">
						<motion.div
							className="h-full bg-teal-500 rounded-full"
							initial={{ width: 0 }}
							whileInView={{ width: '75%' }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.5 }}
						/>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

export function ApiAccessMockup() {
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
						<span className="text-slate-500"> /api/v1/short-url</span>
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
							<span className="text-blue-400">&quot;destinationUrl&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-amber-300">&quot;https://example.com/...&quot;</span>
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
							<span className="text-blue-400">&quot;shortCode&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-emerald-400">&quot;x7k9m&quot;</span>
						</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;destinationUrl&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-emerald-400">&quot;https://example.com/...&quot;</span>
						</div>
						<div className="pl-3">
							<span className="text-blue-400">&quot;isActive&quot;</span>
							<span className="text-slate-500">: </span>
							<span className="text-emerald-400">true</span>
						</div>
						<div className="text-slate-500">{'}'}</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
