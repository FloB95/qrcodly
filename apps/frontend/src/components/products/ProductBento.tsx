'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { SectionHead, cardClass, darkCardClass } from '@/components/marketing/SectionHead';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';

export type BentoTile = {
	title: string;
	description: string;
	/** Columns of the 6-column grid on large screens. */
	span: 2 | 3 | 4 | 6;
	visual?: ReactNode;
	icon?: ReactNode;
	dark?: boolean;
	comingSoon?: string;
	action?: { label: string; href: string; external?: boolean };
};

// Laptops get two columns: wide tiles take a whole row, so their visuals keep their room.
const SPAN: Record<BentoTile['span'], string> = {
	2: 'xl:col-span-2',
	3: 'xl:col-span-3',
	4: 'lg:col-span-2 xl:col-span-4',
	6: 'lg:col-span-2 xl:col-span-6',
};

/** Narrow tiles that would sit alone in a two-column row; they take the whole row instead. */
function loneOnLaptop(tiles: BentoTile[]) {
	const narrow = tiles.map((tile) => tile.span < 4);
	const lone = new Set<number>();
	for (let i = 0; i < narrow.length; i++) {
		if (!narrow[i]) continue;
		if (narrow[i + 1]) i++;
		else lone.add(i);
	}
	return lone;
}

function ActionLink({
	action,
	className,
}: {
	action: NonNullable<BentoTile['action']>;
	className: string;
}) {
	const content = (
		<>
			{action.label}
			<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
		</>
	);
	return action.external ? (
		<a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
			{content}
		</a>
	) : (
		<Link href={action.href} className={className}>
			{content}
		</Link>
	);
}

function Tile({ tile, heading: Heading }: { tile: BentoTile; heading: 'h2' | 'h3' }) {
	const wide = tile.span >= 4 && tile.visual;
	return (
		<div
			className={cn(
				'flex h-full flex-col gap-6 p-6 sm:p-8',
				tile.dark ? darkCardClass : cardClass,
				wide && 'lg:grid lg:grid-cols-2 lg:items-center lg:gap-10',
			)}
		>
			<div className="flex flex-col gap-3">
				{tile.icon && (
					<span
						className={cn(
							'flex size-11 items-center justify-center rounded-xl',
							tile.dark ? 'bg-white/10 text-amber-300' : 'bg-slate-100 text-slate-700',
						)}
					>
						{tile.icon}
					</span>
				)}
				{tile.comingSoon && (
					<Badge variant="blue" className="self-start">
						{tile.comingSoon}
					</Badge>
				)}
				<Heading className="text-xl font-bold tracking-tight text-balance sm:text-2xl">
					{tile.title}
				</Heading>
				<p
					className={cn(
						'text-[15px] leading-relaxed',
						tile.dark ? 'text-slate-300' : 'text-slate-600',
					)}
				>
					{tile.description}
				</p>
				{tile.action && (
					<ActionLink
						action={tile.action}
						className={cn(
							'group mt-1 inline-flex items-center gap-2 self-start text-sm font-semibold',
							tile.dark ? 'text-amber-300' : 'text-slate-900',
						)}
					/>
				)}
			</div>
			{tile.visual && <div className="min-w-0">{tile.visual}</div>}
		</div>
	);
}

export function ProductBento({
	eyebrow,
	title,
	subtitle,
	tiles,
}: {
	eyebrow?: string;
	/** Without a section title the tile titles become the h2s. */
	title?: string;
	subtitle?: string;
	tiles: BentoTile[];
}) {
	const lone = loneOnLaptop(tiles);
	return (
		<section className="py-12 sm:py-20">
			<Container>
				<div className="sm:px-6 lg:px-8">
					{title && <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />}
					<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-6">
						{tiles.map((tile, i) => (
							<AnimateOnScroll
								key={tile.title}
								delay={(i % 3) * 0.08}
								className={cn(SPAN[tile.span], lone.has(i) && 'lg:col-span-2')}
							>
								<Tile tile={tile} heading={title ? 'h3' : 'h2'} />
							</AnimateOnScroll>
						))}
					</div>
				</div>
			</Container>
		</section>
	);
}
