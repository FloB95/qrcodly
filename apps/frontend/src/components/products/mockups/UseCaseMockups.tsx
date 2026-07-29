'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
	ArrowLongRightIcon,
	ArrowPathIcon,
	CheckIcon,
	XMarkIcon,
	QrCodeIcon,
	LinkIcon,
	ChartBarIcon,
	CommandLineIcon,
	TagIcon,
	GlobeAltIcon,
	SignalIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, ReactNode } from 'react';
import { BrandQr } from './BrandQr';

/* ------------------------------------------------------------------ */
/* Shared shell                                                        */
/* ------------------------------------------------------------------ */

export type MockupTone = 'amber' | 'violet' | 'emerald' | 'teal' | 'sky' | 'indigo';

const TONE_BG: Record<MockupTone, string> = {
	amber: 'from-amber-50 to-orange-50',
	violet: 'from-violet-50 to-purple-50',
	emerald: 'from-emerald-50 to-teal-50',
	teal: 'from-teal-50 to-cyan-50',
	sky: 'from-sky-50 to-blue-50',
	indigo: 'from-indigo-50 to-blue-50',
};

const TONE_ACCENT: Record<MockupTone, string> = {
	amber: 'text-amber-600',
	violet: 'text-violet-600',
	emerald: 'text-emerald-600',
	teal: 'text-teal-600',
	sky: 'text-sky-600',
	indigo: 'text-indigo-600',
};

const TONE_ACCENT_BG: Record<MockupTone, string> = {
	amber: 'bg-amber-500',
	violet: 'bg-violet-500',
	emerald: 'bg-emerald-500',
	teal: 'bg-teal-500',
	sky: 'bg-sky-500',
	indigo: 'bg-indigo-500',
};

function MockupShell({
	tone,
	label,
	icon: Icon,
	badge,
	children,
	ariaLabel,
}: {
	tone: MockupTone;
	label: string;
	icon: ComponentType<{ className?: string }>;
	badge?: string;
	children: ReactNode;
	ariaLabel: string;
}) {
	return (
		<div
			role="img"
			aria-label={ariaLabel}
			className={`relative bg-gradient-to-br ${TONE_BG[tone]} rounded-3xl p-4 sm:p-6 min-h-[350px] sm:min-h-[426px] flex flex-col overflow-hidden`}
		>
			<div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 sm:p-6 flex-1 flex flex-col">
				<div className="flex items-center justify-between mb-4 gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<Icon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0" />
						<span className="text-xs sm:text-sm font-medium text-slate-600 truncate">{label}</span>
					</div>
					{badge && (
						<span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-emerald-700 flex-shrink-0">
							{badge}
						</span>
					)}
				</div>
				{children}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* QR tile — the real branded code on its quiet zone                   */
/* ------------------------------------------------------------------ */

/** The white padding is the quiet zone a scanner needs around the code. */
function QrTile({ className = 'w-20 h-20' }: { className?: string }) {
	return (
		<div className={`bg-white rounded-lg p-1.5 shadow-sm ${className}`}>
			<BrandQr className="w-full h-full" />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* 1. Scan destination — what the guest/visitor lands on               */
/* ------------------------------------------------------------------ */

export function ScanDestinationMockup({
	tone = 'amber',
	label,
	badge,
	screenTitle,
	rows,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	screenTitle: string;
	rows: Array<{ name: string; meta: string }>;
	ariaLabel: string;
}) {
	return (
		<MockupShell tone={tone} label={label} icon={QrCodeIcon} badge={badge} ariaLabel={ariaLabel}>
			<div className="flex-1 flex items-center justify-center gap-3 sm:gap-5">
				<motion.div
					className="flex-shrink-0 flex flex-col items-center gap-2"
					initial={{ opacity: 0, scale: 0.9 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.45 }}
				>
					<QrTile className="w-20 h-20 sm:w-24 sm:h-24" />
					<ArrowLongRightIcon className="h-4 w-4 text-slate-300" />
				</motion.div>

				{/* Phone */}
				<motion.div
					className="flex-1 max-w-[190px] bg-slate-900 rounded-2xl p-1.5 shadow-lg"
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.45, delay: 0.2 }}
				>
					<div className="bg-white rounded-xl overflow-hidden">
						<div className="px-3 py-2.5 border-b border-slate-100">
							<div className="text-[11px] sm:text-xs font-semibold text-slate-900 truncate">
								{screenTitle}
							</div>
						</div>
						<div className="divide-y divide-slate-50">
							{rows.map((row, i) => (
								<motion.div
									key={row.name}
									className="px-3 py-2 flex items-center justify-between gap-2"
									initial={{ opacity: 0 }}
									whileInView={{ opacity: 1 }}
									viewport={{ once: true }}
									transition={{ duration: 0.3, delay: 0.35 + i * 0.1 }}
								>
									<span className="text-[10px] sm:text-[11px] text-slate-700 truncate">
										{row.name}
									</span>
									<span
										className={`text-[10px] sm:text-[11px] font-medium flex-shrink-0 ${TONE_ACCENT[tone]}`}
									>
										{row.meta}
									</span>
								</motion.div>
							))}
						</div>
					</div>
				</motion.div>
			</div>
		</MockupShell>
	);
}

/* ------------------------------------------------------------------ */
/* 2. Dynamic swap — one printed code, changing destination            */
/* ------------------------------------------------------------------ */

export function DynamicSwapMockup({
	tone = 'emerald',
	label,
	badge,
	printedLabel,
	oldDestination,
	newDestination,
	footnote,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	printedLabel: string;
	oldDestination: string;
	newDestination: string;
	footnote: string;
	ariaLabel: string;
}) {
	const reduceMotion = useReducedMotion();

	return (
		<MockupShell tone={tone} label={label} icon={ArrowPathIcon} badge={badge} ariaLabel={ariaLabel}>
			<div className="flex-1 flex flex-col justify-center gap-4">
				<div className="flex items-center gap-3 sm:gap-4">
					<div className="flex flex-col items-center gap-1.5 flex-shrink-0">
						<QrTile className="w-20 h-20 sm:w-24 sm:h-24" />
						<span className="text-[9px] sm:text-[10px] text-slate-400 font-medium text-center max-w-[80px] leading-tight">
							{printedLabel}
						</span>
					</div>

					<div className="flex-1 min-w-0 space-y-2">
						{/* Retired destination */}
						<motion.div
							className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
							initial={{ opacity: 1 }}
							whileInView={reduceMotion ? {} : { opacity: 0.45 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.8 }}
						>
							<XMarkIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
							<span className="text-[10px] sm:text-xs text-slate-400 line-through truncate">
								{oldDestination}
							</span>
						</motion.div>

						{/* New destination */}
						<motion.div
							className="flex items-center gap-2 rounded-lg border-2 border-teal-500/40 bg-teal-50/60 px-2.5 py-2"
							initial={{ opacity: 0, x: 12 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.45, delay: 1 }}
						>
							<CheckIcon className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
							<span className="text-[10px] sm:text-xs text-slate-800 font-medium truncate">
								{newDestination}
							</span>
						</motion.div>
					</div>
				</div>

				<div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
					<ArrowPathIcon className={`h-3.5 w-3.5 flex-shrink-0 ${TONE_ACCENT[tone]}`} />
					<span className="text-[10px] sm:text-xs text-slate-600 leading-snug">{footnote}</span>
				</div>
			</div>
		</MockupShell>
	);
}

/* ------------------------------------------------------------------ */
/* 3. Scan / click insights                                            */
/* ------------------------------------------------------------------ */

export function ScanInsightsMockup({
	tone = 'indigo',
	label,
	badge,
	metricValue,
	metricLabel,
	trend,
	bars,
	breakdown,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	metricValue: string;
	metricLabel: string;
	trend?: string;
	bars: number[];
	breakdown: Array<{ name: string; share: number }>;
	ariaLabel: string;
}) {
	return (
		<MockupShell tone={tone} label={label} icon={ChartBarIcon} badge={badge} ariaLabel={ariaLabel}>
			<div className="flex-1 flex flex-col gap-4">
				<div className="flex items-end justify-between gap-3">
					<div>
						<div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
							{metricValue}
						</div>
						<div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{metricLabel}</div>
					</div>
					{trend && (
						<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] sm:text-xs font-medium text-emerald-700">
							<SignalIcon className="h-3 w-3" />
							{trend}
						</span>
					)}
				</div>

				<div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20">
					{bars.map((h, i) => (
						<motion.div
							key={i}
							className={`flex-1 rounded-t ${TONE_ACCENT_BG[tone]} opacity-80`}
							initial={{ height: 0 }}
							whileInView={{ height: `${h}%` }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
						/>
					))}
				</div>

				<div className="space-y-2 pt-1">
					{breakdown.map((item, i) => (
						<motion.div
							key={item.name}
							className="flex items-center gap-2"
							initial={{ opacity: 0, x: -8 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.35, delay: 0.4 + i * 0.1 }}
						>
							<span className="text-[10px] sm:text-xs text-slate-600 w-20 sm:w-24 truncate flex-shrink-0">
								{item.name}
							</span>
							<div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
								<motion.div
									className={`h-full rounded-full ${TONE_ACCENT_BG[tone]} opacity-70`}
									initial={{ width: 0 }}
									whileInView={{ width: `${item.share}%` }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
								/>
							</div>
							<span className="text-[10px] sm:text-xs text-slate-400 w-8 text-right flex-shrink-0">
								{item.share}%
							</span>
						</motion.div>
					))}
				</div>
			</div>
		</MockupShell>
	);
}

/* ------------------------------------------------------------------ */
/* 4. Placement — the code on a physical medium                        */
/* ------------------------------------------------------------------ */

export function PlacementMockup({
	tone = 'violet',
	label,
	badge,
	mediumLabel,
	headline,
	caption,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	mediumLabel: string;
	headline: string;
	caption: string;
	ariaLabel: string;
}) {
	return (
		<MockupShell tone={tone} label={label} icon={QrCodeIcon} badge={badge} ariaLabel={ariaLabel}>
			<div className="flex-1 flex flex-col items-center justify-center gap-4">
				{/* Printed medium */}
				<motion.div
					className="relative bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 shadow-sm flex flex-col items-center gap-2.5 max-w-[210px]"
					initial={{ opacity: 0, y: 14, rotate: -1.5 }}
					whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					<span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-400">
						{mediumLabel}
					</span>
					<QrTile className="w-24 h-24 sm:w-28 sm:h-28" />
					<span className="text-[10px] sm:text-xs font-medium text-slate-700 text-center leading-snug">
						{headline}
					</span>
				</motion.div>

				{/* Scan pulse */}
				<motion.div
					className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.45 }}
				>
					<span className={`relative flex h-2 w-2 flex-shrink-0`}>
						<span
							className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${TONE_ACCENT_BG[tone]}`}
						/>
						<span className={`relative inline-flex h-2 w-2 rounded-full ${TONE_ACCENT_BG[tone]}`} />
					</span>
					<span className="text-[10px] sm:text-xs text-slate-600">{caption}</span>
				</motion.div>
			</div>
		</MockupShell>
	);
}

/* ------------------------------------------------------------------ */
/* 5. Branded link — generic vs. own domain                            */
/* ------------------------------------------------------------------ */

export function BrandedLinkMockup({
	tone = 'teal',
	label,
	badge,
	genericLink,
	brandedLink,
	genericNote,
	brandedNote,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	genericLink: string;
	brandedLink: string;
	genericNote: string;
	brandedNote: string;
	ariaLabel: string;
}) {
	return (
		<MockupShell tone={tone} label={label} icon={LinkIcon} badge={badge} ariaLabel={ariaLabel}>
			<div className="flex-1 flex flex-col justify-center gap-3">
				<motion.div
					className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4 }}
				>
					<div className="flex items-center gap-2 mb-1.5">
						<XMarkIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
						<span className="text-[11px] sm:text-xs font-mono text-slate-400 truncate">
							{genericLink}
						</span>
					</div>
					<div className="text-[10px] sm:text-[11px] text-slate-400 pl-5.5">{genericNote}</div>
				</motion.div>

				<motion.div
					className="rounded-xl border-2 border-teal-500/40 bg-white p-3.5 shadow-sm"
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.2 }}
				>
					<div className="flex items-center gap-2 mb-1.5">
						<CheckIcon className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
						<span className="text-[11px] sm:text-xs font-mono font-medium text-slate-900 truncate">
							{brandedLink}
						</span>
					</div>
					<div className="text-[10px] sm:text-[11px] text-slate-500 pl-5.5">{brandedNote}</div>
				</motion.div>

				<motion.div
					className="flex items-center justify-center gap-1.5 pt-1"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.4 }}
				>
					<GlobeAltIcon className={`h-3.5 w-3.5 ${TONE_ACCENT[tone]}`} />
					<span className="text-[10px] sm:text-xs text-slate-500">{brandedLink.split('/')[0]}</span>
				</motion.div>
			</div>
		</MockupShell>
	);
}

/* ------------------------------------------------------------------ */
/* 6. API snippet                                                      */
/* ------------------------------------------------------------------ */

export function ApiSnippetMockup({
	tone = 'sky',
	label,
	badge,
	method,
	endpoint,
	requestLines,
	responseLabel,
	responseValue,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	method: string;
	endpoint: string;
	requestLines: string[];
	responseLabel: string;
	responseValue: string;
	ariaLabel: string;
}) {
	return (
		<MockupShell
			tone={tone}
			label={label}
			icon={CommandLineIcon}
			badge={badge}
			ariaLabel={ariaLabel}
		>
			<div className="flex-1 flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 font-mono flex-shrink-0">
						{method}
					</span>
					<span className="text-[10px] sm:text-xs font-mono text-slate-600 truncate">
						{endpoint}
					</span>
				</div>

				<motion.div
					className="rounded-xl bg-slate-900 p-3 sm:p-3.5 flex-1 overflow-hidden"
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4 }}
				>
					<div className="space-y-1">
						{requestLines.map((line, i) => (
							<motion.div
								key={line}
								className="text-[9px] sm:text-[11px] font-mono text-slate-300 whitespace-pre truncate"
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								transition={{ duration: 0.25, delay: 0.2 + i * 0.08 }}
							>
								{line}
							</motion.div>
						))}
					</div>
				</motion.div>

				<motion.div
					className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.6 }}
				>
					<span className="text-[10px] sm:text-xs text-slate-500 flex-shrink-0">
						{responseLabel}
					</span>
					<span className="text-[10px] sm:text-xs font-mono font-medium text-slate-900 truncate">
						{responseValue}
					</span>
				</motion.div>
			</div>
		</MockupShell>
	);
}

/* ------------------------------------------------------------------ */
/* 7. Organised link list                                              */
/* ------------------------------------------------------------------ */

export function LinkListMockup({
	tone = 'teal',
	label,
	badge,
	rows,
	ariaLabel,
}: {
	tone?: MockupTone;
	label: string;
	badge?: string;
	rows: Array<{ link: string; tag: string; clicks: string }>;
	ariaLabel: string;
}) {
	return (
		<MockupShell tone={tone} label={label} icon={TagIcon} badge={badge} ariaLabel={ariaLabel}>
			<div className="flex-1 flex flex-col gap-2 justify-center">
				{rows.map((row, i) => (
					<motion.div
						key={row.link}
						className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center gap-2.5 shadow-sm"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.35, delay: i * 0.1 }}
					>
						<div
							className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 ${TONE_ACCENT[tone]}`}
						>
							<LinkIcon className="h-3.5 w-3.5" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-[10px] sm:text-xs font-mono text-slate-800 truncate">
								{row.link}
							</div>
							<div className="text-[9px] sm:text-[10px] text-slate-400 truncate">{row.tag}</div>
						</div>
						<span className="text-[10px] sm:text-xs font-medium text-slate-600 flex-shrink-0">
							{row.clicks}
						</span>
					</motion.div>
				))}
			</div>
		</MockupShell>
	);
}
