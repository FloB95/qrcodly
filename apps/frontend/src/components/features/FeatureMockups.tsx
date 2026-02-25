'use client';

import {
	ArrowDownTrayIcon,
	ArrowsRightLeftIcon,
	CalendarIcon,
	ChartBarIcon,
	CheckIcon,
	DocumentTextIcon,
	EnvelopeIcon,
	GlobeAltIcon,
	IdentificationIcon,
	LinkIcon,
	MapPinIcon,
	PlusIcon,
	QrCodeIcon,
	ShareIcon,
	ShieldCheckIcon,
	Squares2X2Icon,
	StarIcon,
	SwatchIcon,
	TagIcon,
	UserGroupIcon,
	WifiIcon,
	BanknotesIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function AnalyticsMockup() {
	const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-4 sm:p-6 aspect-[4/3] overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Analytics Overview</span>
				</div>

				<div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Total Scans</div>
						<div className="text-base sm:text-lg font-bold text-slate-900">2,847</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+12.5%</div>
					</div>
					<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400">Visitors</div>
						<div className="text-base sm:text-lg font-bold text-slate-900">1,523</div>
						<div className="text-[10px] sm:text-xs text-emerald-600 font-medium">+8.3%</div>
					</div>
				</div>

				<div className="flex items-end gap-1 sm:gap-1.5 flex-1 min-h-0">
					{bars.map((h, i) => (
						<motion.div
							key={i}
							className="flex-1 bg-slate-900 rounded-t-sm"
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

export function DynamicQrMockup() {
	return (
		<div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div className="flex items-center gap-2">
						<QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
						<span className="text-xs sm:text-sm font-medium text-slate-600">Dynamic QR Code</span>
					</div>
					<span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-emerald-700">
						Active
					</span>
				</div>

				<div className="flex-1 flex items-center justify-center gap-4 sm:gap-6">
					<div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-900 rounded-xl sm:rounded-2xl p-2 sm:p-3 flex-shrink-0">
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
					</div>

					<div className="flex flex-col gap-2 sm:gap-3">
						<div className="bg-slate-50 rounded-lg p-2 sm:p-3">
							<div className="text-[10px] sm:text-xs text-slate-400 mb-1">Destination</div>
							<div className="text-[10px] sm:text-xs font-mono text-slate-600 line-through">
								example.com/old
							</div>
							<div className="text-[10px] sm:text-xs font-mono text-slate-900 font-medium">
								example.com/new
							</div>
						</div>
						<div className="bg-emerald-50 rounded-lg p-1.5 sm:p-2 text-center">
							<div className="text-[10px] sm:text-xs text-emerald-700 font-medium">
								Updated instantly
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function CollectionMockup() {
	return (
		<div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-2 sm:p-4 aspect-[4/3] overflow-hidden">
			<div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden h-full flex flex-col">
				<div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 border-b border-gray-200">
					<div className="flex gap-1 sm:gap-1.5">
						<div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400" />
						<div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
						<div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-400" />
					</div>
					<div className="flex-1 flex justify-center">
						<div className="bg-white rounded-md border border-gray-200 px-3 sm:px-4 py-0.5 sm:py-1 text-[9px] sm:text-xs text-gray-500">
							app.qrcodly.de/dashboard
						</div>
					</div>
				</div>
				<div className="relative flex-1 bg-gradient-to-br from-slate-50 to-slate-100">
					<Image
						src="/images/dashboard-mockup.png"
						alt="QRcodly Dashboard"
						fill
						className="object-cover object-left-top"
						sizes="(max-width: 768px) 100vw, 50vw"
						loading="lazy"
					/>
				</div>
			</div>
		</div>
	);
}

export function SecurityMockup() {
	return (
		<div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col items-center justify-center text-center">
				<div className="w-14 h-14 sm:w-20 sm:h-20 bg-emerald-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 sm:mb-4">
					<ShieldCheckIcon className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600" />
				</div>

				<div className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
					Privacy-Focused & Open Source
				</div>

				<div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
					<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-slate-600">
						<CheckIcon className="h-3 w-3 text-emerald-500" />
						GDPR
					</span>
					<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-slate-600">
						<CheckIcon className="h-3 w-3 text-emerald-500" />
						Open Source
					</span>
					<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-slate-600">
						<CheckIcon className="h-3 w-3 text-emerald-500" />
						German Hosting
					</span>
				</div>
			</div>
		</div>
	);
}

export function TemplatesMockup() {
	const templates = [
		{ name: 'Brand Blue', colors: ['bg-blue-600', 'bg-blue-400', 'bg-blue-200'] },
		{ name: 'Sunset', colors: ['bg-orange-500', 'bg-amber-400', 'bg-yellow-300'] },
		{ name: 'Forest', colors: ['bg-emerald-600', 'bg-green-400', 'bg-lime-300'] },
	];
	return (
		<div className="relative bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<StarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">My Templates</span>
				</div>

				<div className="flex-1 flex flex-col gap-2 sm:gap-3">
					{templates.map((tpl) => (
						<motion.div
							key={tpl.name}
							className="flex items-center gap-3 bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3"
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4 }}
						>
							<div className="flex gap-1">
								{tpl.colors.map((color) => (
									<div key={color} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md ${color}`} />
								))}
							</div>
							<span className="text-[10px] sm:text-xs font-medium text-slate-700 flex-1">
								{tpl.name}
							</span>
							<SwatchIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

export function CustomDomainMockup() {
	return (
		<div className="relative bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<GlobeAltIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Custom Domain</span>
				</div>

				<div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
					<div className="bg-slate-50 rounded-lg p-2.5 sm:p-3">
						<div className="text-[10px] sm:text-xs text-slate-400 mb-1">Default</div>
						<div className="text-[10px] sm:text-xs font-mono text-slate-500">qrcodly.de/abc123</div>
					</div>

					<div className="flex justify-center">
						<ArrowsRightLeftIcon className="h-4 w-4 text-slate-300" />
					</div>

					<div className="bg-blue-50 rounded-lg p-2.5 sm:p-3 border border-blue-200">
						<div className="text-[10px] sm:text-xs text-blue-500 mb-1">Your Domain</div>
						<div className="text-[10px] sm:text-xs font-mono text-blue-700 font-medium">
							go.yourbrand.com/abc123
						</div>
						<div className="flex items-center gap-1 mt-1.5">
							<CheckIcon className="h-3 w-3 text-emerald-500" />
							<span className="text-[9px] sm:text-[10px] text-emerald-600">SSL Active</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function TagsMockup() {
	const tags = [
		{ label: 'Marketing', color: 'bg-blue-500', count: 14 },
		{ label: 'Events', color: 'bg-purple-500', count: 9 },
		{ label: 'Products', color: 'bg-amber-500', count: 18 },
		{ label: 'Social', color: 'bg-pink-500', count: 7 },
	];
	return (
		<div className="relative bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<TagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Tags</span>
				</div>

				<div className="flex-1 flex flex-col gap-2 sm:gap-2.5">
					{tags.map((tag) => (
						<motion.div
							key={tag.label}
							className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-2 sm:p-2.5"
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.3 }}
						>
							<div className={`w-3 h-3 rounded-full ${tag.color} flex-shrink-0`} />
							<span className="text-[10px] sm:text-xs font-medium text-slate-700">{tag.label}</span>
							<span className="ml-auto text-[9px] sm:text-[10px] text-slate-400 bg-white rounded-full px-2 py-0.5">
								{tag.count} codes
							</span>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

export function BulkOperationsMockup() {
	return (
		<div className="relative bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center gap-2 mb-3 sm:mb-4">
					<ArrowsRightLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
					<span className="text-xs sm:text-sm font-medium text-slate-600">Bulk Operations</span>
				</div>

				<div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
					<motion.div
						className="flex items-center gap-3 bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4 }}
					>
						<div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
							<LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
						</div>
						<div>
							<div className="text-[10px] sm:text-xs font-medium text-slate-700">CSV Import</div>
							<div className="text-[9px] sm:text-[10px] text-slate-400">Upload URLs in bulk</div>
						</div>
					</motion.div>

					<motion.div
						className="flex items-center gap-3 bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.1 }}
					>
						<div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
							<ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
						</div>
						<div>
							<div className="text-[10px] sm:text-xs font-medium text-slate-700">ZIP Export</div>
							<div className="text-[9px] sm:text-[10px] text-slate-400">
								Download all as archive
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

export function ContentTypesMockup() {
	const types = [
		{ icon: <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'URL' },
		{
			icon: <DocumentTextIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'Text',
		},
		{ icon: <WifiIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />, label: 'WiFi' },
		{
			icon: <IdentificationIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'vCard',
		},
		{
			icon: <EnvelopeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'Email',
		},
		{
			icon: <MapPinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'Location',
		},
		{
			icon: <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'Event',
		},
		{
			icon: <BanknotesIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'EPC',
		},
		{
			icon: <ShareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
			label: 'Social',
		},
	];
	return (
		<div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-3 sm:p-6 h-full flex flex-col">
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

export function TeamsMockup() {
	const members = [
		{
			name: 'Sarah K.',
			initials: 'SK',
			role: 'Admin',
			color: 'bg-indigo-500',
			badge: 'bg-indigo-100 text-indigo-700',
		},
		{
			name: 'Marco R.',
			initials: 'MR',
			role: 'Editor',
			color: 'bg-emerald-500',
			badge: 'bg-emerald-100 text-emerald-700',
		},
		{
			name: 'Lisa M.',
			initials: 'LM',
			role: 'Viewer',
			color: 'bg-amber-500',
			badge: 'bg-amber-100 text-amber-700',
		},
	];
	return (
		<div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-4 sm:p-6 min-h-fit overflow-hidden">
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 h-full flex flex-col">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div className="flex items-center gap-2">
						<UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
						<span className="text-xs sm:text-sm font-medium text-slate-600">Team Workspace</span>
					</div>
					<span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-indigo-700">
						Coming Soon
					</span>
				</div>

				<div className="bg-slate-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4">
					<div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">Organization</div>
					<div className="text-xs sm:text-sm font-semibold text-slate-900">Acme Agency</div>
				</div>

				<div className="flex-1 flex flex-col gap-1.5 sm:gap-2">
					{members.map((member) => (
						<motion.div
							key={member.name}
							className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-2 sm:p-2.5"
							initial={{ opacity: 0, x: -20 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4 }}
						>
							<div
								className={`w-6 h-6 sm:w-7 sm:h-7 ${member.color} rounded-full flex items-center justify-center flex-shrink-0`}
							>
								<span className="text-[8px] sm:text-[10px] font-bold text-white">
									{member.initials}
								</span>
							</div>
							<span className="text-[10px] sm:text-xs font-medium text-slate-700 flex-1">
								{member.name}
							</span>
							<span
								className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${member.badge}`}
							>
								{member.role}
							</span>
						</motion.div>
					))}

					<motion.div
						className="flex items-center gap-2.5 border-2 border-dashed border-slate-200 rounded-lg p-2 sm:p-2.5"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.3 }}
					>
						<div className="w-6 h-6 sm:w-7 sm:h-7 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
							<PlusIcon className="h-3 w-3 text-slate-400" />
						</div>
						<span className="text-[10px] sm:text-xs text-slate-400">Invite team member...</span>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
