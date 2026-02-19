'use client';

import {
	ArrowsRightLeftIcon,
	ChartBarIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	GlobeAltIcon,
	QrCodeIcon,
	RectangleStackIcon,
	ShieldCheckIcon,
	StarIcon,
	TagIcon,
} from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import Container from '@/components/ui/container';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface FeatureCardData {
	icon: ReactNode;
	headlineKey: string;
	subHeadlineKey: string;
	badge?: string;
}

export function FeatureSlider() {
	const t = useTranslations('contentElements.featuresCta');
	const tGeneral = useTranslations('general');
	const scrollRef = useRef<HTMLDivElement>(null);
	const headlineRef = useRef<HTMLHeadingElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);
	const [contentLeft, setContentLeft] = useState(24);

	const features: FeatureCardData[] = [
		{
			icon: <ShieldCheckIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'secureFeature.headline',
			subHeadlineKey: 'secureFeature.subHeadline',
		},
		{
			icon: <QrCodeIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'editFeature.headline',
			subHeadlineKey: 'editFeature.subHeadline',
		},
		{
			icon: <ChartBarIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'statisticFeature.headline',
			subHeadlineKey: 'statisticFeature.subHeadline',
		},
		{
			icon: <RectangleStackIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'overviewFeature.headline',
			subHeadlineKey: 'overviewFeature.subHeadline',
		},
		{
			icon: <StarIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'templateFeature.headline',
			subHeadlineKey: 'templateFeature.subHeadline',
		},
		{
			icon: <TagIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'tagFeature.headline',
			subHeadlineKey: 'tagFeature.subHeadline',
		},
		{
			icon: <ArrowsRightLeftIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'exportImportFeature.headline',
			subHeadlineKey: 'exportImportFeature.subHeadline',
		},
		{
			icon: <GlobeAltIcon className="h-9 w-9 sm:h-11 sm:w-11" />,
			headlineKey: 'customDomainFeature.headline',
			subHeadlineKey: 'customDomainFeature.subHeadline',
			badge: tGeneral('proRequired'),
		},
	];

	const checkScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 1);
		setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
	}, []);

	const measureContentLeft = useCallback(() => {
		if (headlineRef.current) {
			setContentLeft(headlineRef.current.getBoundingClientRect().left);
		}
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener('scroll', checkScroll, { passive: true });
		checkScroll();

		measureContentLeft();
		const handleResize = () => {
			checkScroll();
			measureContentLeft();
		};
		window.addEventListener('resize', handleResize);
		return () => {
			el.removeEventListener('scroll', checkScroll);
			window.removeEventListener('resize', handleResize);
		};
	}, [checkScroll, measureContentLeft]);

	const scroll = (direction: 'left' | 'right') => {
		const el = scrollRef.current;
		if (!el) return;
		const firstCard = el.querySelector<HTMLElement>('[data-feature-card]');
		if (!firstCard) return;
		const cardWidth = firstCard.offsetWidth + 20; // card width + gap (20px)
		el.scrollBy({
			left: direction === 'left' ? -cardWidth : cardWidth,
			behavior: 'smooth',
		});
	};

	return (
		<div className="overflow-hidden">
			{/* Headline — aligned with Container content edge */}
			<Container disableOverflow className="mb-10 sm:mb-14">
				<div className="sm:px-6 lg:px-8 flex items-end justify-between gap-4">
					<h2
						ref={headlineRef}
						className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 max-w-xl leading-tight"
					>
						{t('headline')}
					</h2>
					<Link
						href="/features"
						className="hidden sm:inline-flex items-center gap-1 text-md font-medium text-black hover:underline transition-colors whitespace-nowrap shrink-0"
					>
						{t('allFeatures')}
						<span aria-hidden="true">&rsaquo;</span>
					</Link>
				</div>
			</Container>

			{/* Scroll container — outer div scrolls, inner div holds flex layout + padding */}
			<div
				ref={scrollRef}
				className="overflow-x-auto overflow-y-hidden scrollbar-hide"
				style={{
					scrollSnapType: 'x mandatory',
					scrollPaddingLeft: `${contentLeft}px`,
				}}
			>
				<div
					className="flex gap-5"
					style={{
						paddingLeft: `${contentLeft}px`,
					}}
				>
					{features.map((feature, index) => (
						<motion.div
							key={feature.headlineKey}
							className="flex-shrink-0 w-[280px] sm:w-[370px]"
							data-feature-card
							style={{ scrollSnapAlign: 'start' }}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{
								duration: 0.6,
								ease: 'easeOut',
								delay: index * 0.1,
							}}
						>
							<div className="relative flex flex-col justify-end bg-white rounded-[20px] sm:rounded-[28px] p-7 sm:p-8 h-[300px] sm:h-[310px]">
								{/* Icon — absolute so it doesn't affect text position */}
								<div className="absolute top-7 left-7 sm:top-7 sm:left-8 text-slate-900">
									{feature.icon}
								</div>

								{/* Badge */}
								{feature.badge && (
									<span className="absolute top-6 right-6 sm:top-7 sm:right-7 inline-flex items-center rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
										{feature.badge}
									</span>
								)}

								{/* Title + description — fixed height so headlines align */}
								<div className="h-[190px] sm:h-[170px]">
									<h3 className="text-lg sm:text-[22px] font-bold text-slate-900 mb-2 leading-tight">
										{t(feature.headlineKey)}
									</h3>
									<p className="text-slate-500 text-[15px] leading-relaxed">
										{t(feature.subHeadlineKey)}
									</p>
								</div>
							</div>
						</motion.div>
					))}
					{/* Spacer so last card has right offset */}
					<div
						className="flex-shrink-0"
						style={{ width: `${Math.max(contentLeft - 20, 0)}px` }}
						aria-hidden="true"
					/>
				</div>
			</div>

			{/* Navigation arrows — below cards, right-aligned with Container */}
			<Container disableOverflow className="mt-8 sm:mt-10">
				<div className="sm:px-6 lg:px-8 flex justify-end">
					<div className="flex items-center gap-3">
						<button
							onClick={() => scroll('left')}
							disabled={!canScrollLeft}
							className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white cursor-pointer transition-all disabled:pointer-events-none disabled:opacity-50"
							aria-label="Scroll left"
						>
							<ChevronLeftIcon className="h-5 w-5 stroke-2" />
						</button>
						<button
							onClick={() => scroll('right')}
							disabled={!canScrollRight}
							className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white cursor-pointer transition-all disabled:pointer-events-none disabled:opacity-50"
							aria-label="Scroll right"
						>
							<ChevronRightIcon className="h-5 w-5 stroke-2" />
						</button>
					</div>
				</div>
			</Container>
		</div>
	);
}
