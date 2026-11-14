'use client';

import Container from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { AnimateOnLoad, AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import {
	ChatBubbleLeftEllipsisIcon,
	CheckCircleIcon,
	DocumentTextIcon,
	EnvelopeIcon,
	IdentificationIcon,
	LinkIcon,
	MapPinIcon,
	PhoneIcon,
	WifiIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

const CONTENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	url: LinkIcon,
	wifi: WifiIcon,
	vcard: IdentificationIcon,
	email: EnvelopeIcon,
	phone: PhoneIcon,
	sms: ChatBubbleLeftEllipsisIcon,
	geo: MapPinIcon,
	text: DocumentTextIcon,
};

export function ScannerHero({
	title,
	subtitle,
	trustItems,
	children,
}: {
	title: string;
	subtitle: string;
	trustItems: string[];
	children: ReactNode;
}) {
	return (
		<Container>
			<div className="pt-16 sm:pt-20 pb-12 sm:pb-16 text-center sm:px-6 lg:px-8">
				<AnimateOnLoad className="mt-14">
					<Heading as="h1" size="hero" className="mb-6 max-w-4xl mx-auto">
						{title}
					</Heading>
				</AnimateOnLoad>
				<AnimateOnLoad delay={0.2}>
					<p className="mx-auto max-w-2xl text-xl sm:text-2xl text-slate-700 mb-10">{subtitle}</p>
				</AnimateOnLoad>
				<AnimateOnLoad delay={0.3}>{children}</AnimateOnLoad>
				<ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-700">
					{trustItems.map((item) => (
						<li key={item} className="flex items-center gap-2">
							<CheckCircleIcon className="h-6 w-6 text-black" aria-hidden />
							{item}
						</li>
					))}
				</ul>
			</div>
		</Container>
	);
}

export function ScannerSteps({
	title,
	subtitle,
	steps,
}: {
	title: string;
	subtitle: string;
	steps: Array<{ title: string; description: string }>;
}) {
	return (
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="lg" className="mb-4">
							{title}
						</Heading>
						<p className="text-slate-600 text-lg sm:text-xl">{subtitle}</p>
					</AnimateOnScroll>

					<ol className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
						{steps.map((step, i) => (
							<li key={step.title}>
								<AnimateOnScroll
									delay={i * 0.1}
									className="border-t-2 border-slate-900 pt-6 h-full"
								>
									<span className="text-sm font-semibold text-slate-500 tabular-nums">
										{String(i + 1).padStart(2, '0')}
									</span>
									<h3 className="mt-3 text-xl font-bold text-slate-900 leading-tight">
										{step.title}
									</h3>
									<p className="mt-3 text-slate-600 text-base leading-relaxed">
										{step.description}
									</p>
								</AnimateOnScroll>
							</li>
						))}
					</ol>
				</div>
			</Container>
		</div>
	);
}

export function ScannerContentTypes({
	title,
	subtitle,
	items,
}: {
	title: string;
	subtitle: string;
	items: Array<{ key: string; title: string; description: string }>;
}) {
	return (
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
						<Heading as="h2" size="lg" className="mb-4">
							{title}
						</Heading>
						<p className="text-slate-600 text-lg sm:text-xl">{subtitle}</p>
					</AnimateOnScroll>

					<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
						{items.map((item, i) => {
							const Icon = CONTENT_TYPE_ICONS[item.key] ?? DocumentTextIcon;
							return (
								<li key={item.key}>
									<AnimateOnScroll delay={i * 0.05}>
										<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
											<Icon className="h-5 w-5" aria-hidden />
										</div>
										<h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
										<p className="mt-2 text-slate-600 text-base leading-relaxed">
											{item.description}
										</p>
									</AnimateOnScroll>
								</li>
							);
						})}
					</ul>
				</div>
			</Container>
		</div>
	);
}
