'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Link } from '@/i18n/navigation';
import {
	LockClosedIcon,
	ArrowPathIcon,
	XMarkIcon,
	CheckIcon,
	ExclamationTriangleIcon,
	ArrowRightIcon,
} from '@heroicons/react/24/outline';

export type OwnershipPill = { label: string };

export function DynamicVsStatic({
	title,
	subtitle,
	staticLabel,
	staticTitle,
	staticPoints,
	dynamicLabel,
	dynamicTitle,
	dynamicPoints,
	lockInTitle,
	lockInDescription,
	lockInPills,
	lockInCtaLabel,
	lockInCtaHref = '/plans',
}: {
	title: string;
	subtitle: string;
	staticLabel: string;
	staticTitle: string;
	staticPoints: string[];
	dynamicLabel: string;
	dynamicTitle: string;
	dynamicPoints: string[];
	lockInTitle: string;
	lockInDescription: string;
	lockInPills: string[];
	lockInCtaLabel?: string;
	lockInCtaHref?: string;
}) {
	return (
		<div className="py-16 sm:py-24 bg-slate-50">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="section" className="mb-4">
							{title}
						</Heading>
						<p className="text-slate-600 text-base sm:text-lg">{subtitle}</p>
					</AnimateOnScroll>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto items-stretch">
						{/* Static — deliberately muted: this is the option that gets stuck */}
						<AnimateOnScroll variant="slideLeft" delay={0.1}>
							<div className="relative rounded-2xl border border-slate-200 bg-white/60 p-6 sm:p-8 h-full">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
										<LockClosedIcon className="h-5 w-5" />
									</div>
									<span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
										{staticLabel}
									</span>
								</div>
								<h3 className="text-lg font-semibold text-slate-500 mb-4">{staticTitle}</h3>
								<ul className="space-y-3">
									{staticPoints.map((point) => (
										<li key={point} className="flex items-start gap-3">
											<XMarkIcon className="h-5 w-5 text-slate-300 flex-shrink-0 mt-0.5" />
											<span className="text-slate-500 text-sm sm:text-base leading-relaxed">
												{point}
											</span>
										</li>
									))}
								</ul>
							</div>
						</AnimateOnScroll>

						{/* Dynamic — the recommended path */}
						<AnimateOnScroll variant="slideRight" delay={0.2}>
							<div className="relative rounded-2xl border-2 border-teal-500/30 bg-white p-6 sm:p-8 h-full shadow-lg shadow-teal-900/5">
								<div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
								<div className="flex items-center gap-3 mb-5">
									<div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white flex-shrink-0">
										<ArrowPathIcon className="h-5 w-5" />
									</div>
									<span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
										{dynamicLabel}
									</span>
								</div>
								<h3 className="text-lg font-semibold text-slate-900 mb-4">{dynamicTitle}</h3>
								<ul className="space-y-3">
									{dynamicPoints.map((point) => (
										<li key={point} className="flex items-start gap-3">
											<CheckIcon className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
											<span className="text-slate-700 text-sm sm:text-base leading-relaxed">
												{point}
											</span>
										</li>
									))}
								</ul>
							</div>
						</AnimateOnScroll>
					</div>

					{/* The honest catch: dynamic means depending on whoever runs the redirect */}
					<AnimateOnScroll delay={0.3} className="max-w-5xl mx-auto mt-4 sm:mt-6">
						<div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10 relative overflow-hidden">
							<div className="absolute top-0 right-0 w-[420px] h-[260px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
							<div className="relative">
								<div className="flex items-start gap-4 mb-5">
									<div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
										<ExclamationTriangleIcon className="h-5 w-5" />
									</div>
									<div>
										<h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
											{lockInTitle}
										</h3>
										<p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
											{lockInDescription}
										</p>
									</div>
								</div>

								<div className="flex flex-wrap gap-2 sm:gap-3 sm:pl-15">
									{lockInPills.map((pill) => (
										<span
											key={pill}
											className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm font-medium text-teal-300"
										>
											<CheckIcon className="h-4 w-4 flex-shrink-0" />
											{pill}
										</span>
									))}
								</div>

								{lockInCtaLabel && (
									<div className="sm:pl-15 mt-6">
										<Link
											href={lockInCtaHref}
											className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-teal-300 transition-colors group"
										>
											{lockInCtaLabel}
											<ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
										</Link>
									</div>
								)}
							</div>
						</div>
					</AnimateOnScroll>
				</div>
			</Container>
		</div>
	);
}
