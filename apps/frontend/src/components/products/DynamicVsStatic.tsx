'use client';

import Container from '@/components/ui/container';
import { SectionHead, cardClass, darkCardClass } from '@/components/marketing/SectionHead';
import { cn } from '@/lib/utils';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { Link } from '@/i18n/navigation';
import { ArrowPathIcon, XMarkIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export function DynamicVsStatic({
	eyebrow,
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
	eyebrow?: string;
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
		<section className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />

					<div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
						{/* Static — deliberately muted: this is the option that gets stuck */}
						<AnimateOnScroll delay={0.05}>
							<div className={cn(cardClass, 'flex h-full flex-col gap-4 p-6 sm:p-8')}>
								<span className="font-mono text-xs tracking-[0.16em] text-slate-500 uppercase">
									{staticLabel}
								</span>
								<h3 className="text-2xl font-bold tracking-tight text-slate-500">{staticTitle}</h3>
								<ul className="flex flex-col gap-3">
									{staticPoints.map((point) => (
										<li key={point} className="flex items-start gap-3">
											<XMarkIcon
												className="mt-0.5 size-5 shrink-0 text-slate-400"
												aria-hidden="true"
											/>
											<span className="text-[15px] leading-relaxed text-slate-600">{point}</span>
										</li>
									))}
								</ul>
							</div>
						</AnimateOnScroll>

						{/* Dynamic — the recommended path */}
						<AnimateOnScroll delay={0.12}>
							<div className={cn(darkCardClass, 'flex h-full flex-col gap-4 p-6 sm:p-8')}>
								<span className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-amber-400 uppercase">
									<ArrowPathIcon className="size-4" aria-hidden="true" />
									{dynamicLabel}
								</span>
								<h3 className="text-2xl font-bold tracking-tight">{dynamicTitle}</h3>
								<ul className="flex flex-col gap-3">
									{dynamicPoints.map((point) => (
										<li key={point} className="flex items-start gap-3">
											<CheckIcon
												className="mt-0.5 size-5 shrink-0 text-amber-300"
												aria-hidden="true"
											/>
											<span className="text-[15px] leading-relaxed text-slate-200">{point}</span>
										</li>
									))}
								</ul>
							</div>
						</AnimateOnScroll>

						{/* The honest catch: dynamic means depending on whoever runs the redirect */}
						<AnimateOnScroll delay={0.18} className="lg:col-span-2">
							<div className={cn(cardClass, 'flex flex-col gap-5 p-6 sm:p-8')}>
								<div className="flex max-w-3xl flex-col gap-2">
									<h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
										{lockInTitle}
									</h3>
									<p className="text-[15px] leading-relaxed text-slate-600">{lockInDescription}</p>
								</div>
								<ul className="flex flex-wrap gap-2">
									{lockInPills.map((pill) => (
										<li
											key={pill}
											className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-sm font-medium text-slate-800"
										>
											<CheckIcon className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
											{pill}
										</li>
									))}
								</ul>
								{lockInCtaLabel && (
									<Link
										href={lockInCtaHref}
										className="group inline-flex items-center gap-2 self-start text-sm font-semibold text-slate-900"
									>
										{lockInCtaLabel}
										<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
									</Link>
								)}
							</div>
						</AnimateOnScroll>
					</div>
				</div>
			</Container>
		</section>
	);
}
