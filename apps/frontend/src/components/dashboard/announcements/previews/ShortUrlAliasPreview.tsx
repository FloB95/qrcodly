'use client';

import { useMemo, type ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { LockClosedIcon, PencilIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { NewBadge } from '../NewBadge';
import { LoopProgress, useLoop, type LoopStep } from './use-loop';

type Phase = 'empty' | 'typing' | 'available' | 'saved' | 'visits';

type State = {
	phase: Phase;
	typed: number;
	visits: number;
	/** The address a visit just came through. */
	hit: 'short' | 'alias' | null;
};

const SHORT_CODE = 'x7k9m';
const VISITS = 1284;
const START: State = { phase: 'empty', typed: 0, visits: VISITS, hit: null };

/** One loop of the story: type the alias, it is free, it is saved, both addresses count. */
function buildSteps(aliasLength: number): LoopStep<State>[] {
	const typing: LoopStep<State>[] = Array.from({ length: aliasLength }, () => [
		85,
		(s) => ({ ...s, phase: 'typing', typed: s.typed + 1 }),
	]);
	const visits: LoopStep<State>[] = (['short', 'alias', 'short'] as const)
		.map((hit): LoopStep<State>[] => [
			[850, (s) => ({ ...s, hit, visits: s.visits + 1 })],
			[450, (s) => ({ ...s, hit: null })],
		])
		.flat();

	return [
		[900, (s) => s],
		...typing,
		[350, (s) => ({ ...s, phase: 'available' })],
		[1200, (s) => ({ ...s, phase: 'saved' })],
		[600, (s) => ({ ...s, phase: 'visits' })],
		...visits,
		[2600, () => START],
	];
}

const fade = {
	initial: { opacity: 0, y: 4 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -4 },
	transition: { duration: 0.2 },
};

/** A small copy of the addresses card on the detail page, telling the alias story in a loop. */
export function ShortUrlAliasPreview() {
	const t = useTranslations('announcements.items.shortUrlAlias.preview');
	const tAlias = useTranslations('shortUrl.alias');
	const format = useFormatter();

	const domain = t('domain');
	const alias = t('alias');
	const steps = useMemo(() => buildSteps(alias.length), [alias.length]);
	const end = useMemo<State>(
		() => ({ phase: 'visits', typed: alias.length, visits: VISITS + 3, hit: null }),
		[alias.length],
	);
	const { state, round, durationMs, animate } = useLoop(steps, START, end);
	const { phase, typed, visits, hit } = state;
	const isSaved = phase === 'saved' || phase === 'visits';

	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(var(--color-slate-200)_1px,transparent_1px)] [background-size:16px_16px] p-6"
		>
			<LoopProgress round={round} durationMs={durationMs} animate={animate} />
			<div className="relative w-full max-w-[360px] rounded-xl border bg-white p-4 text-left shadow-sm">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium text-muted-foreground">
						{tAlias('addresses.shortUrl')}
					</span>
					<span className="flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium">
						<LockClosedIcon className="size-3" />
						{tAlias('addresses.fixed')}
					</span>
				</div>
				<Address highlighted={hit === 'short'}>
					{domain}/u/{SHORT_CODE}
				</Address>

				<div className="my-3 h-px bg-border" />

				<div className="flex items-center gap-2">
					<span className="text-xs font-medium text-muted-foreground">{tAlias('label')}</span>
					{isSaved ? (
						<span className="flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium">
							<PencilIcon className="size-3" />
							{tAlias('addresses.changeable')}
						</span>
					) : (
						<NewBadge />
					)}
				</div>

				<div className="relative h-[58px]">
					<AnimatePresence mode="wait" initial={false}>
						{isSaved ? (
							<motion.div key="saved" {...fade}>
								<Address highlighted={hit === 'alias'}>
									{domain}/u/{alias}
								</Address>
							</motion.div>
						) : (
							<motion.div key="input" {...fade}>
								<div
									className={cn(
										'mt-1.5 flex h-9 items-center rounded-md border bg-white px-2.5 text-[13px] transition-shadow',
										phase !== 'empty' && 'border-slate-400 ring-3 ring-slate-200',
									)}
								>
									<span className="text-muted-foreground">{domain}/u/</span>
									<span className="font-medium text-slate-900">{alias.slice(0, typed)}</span>
									<motion.span
										className="ml-px h-4 w-px bg-slate-900"
										animate={{ opacity: [1, 0] }}
										transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
									/>
								</div>
								<AnimatePresence>
									{phase === 'available' && (
										<motion.p
											{...fade}
											className="mt-1.5 flex items-center gap-1 text-xs text-emerald-700"
										>
											<CheckCircleIcon className="size-3.5" />
											{tAlias('available', { address: `${domain}/u/${alias}` })}
										</motion.p>
									)}
								</AnimatePresence>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<AnimatePresence>
					{phase === 'visits' && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 6 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{ type: 'spring', stiffness: 380, damping: 26 }}
							className="absolute -right-3 -bottom-5 rounded-lg border bg-white px-3 py-2 shadow-md"
						>
							<p className="text-[11px] text-muted-foreground">{t('visits')}</p>
							<p className="relative h-6 overflow-hidden text-lg leading-6 font-semibold text-slate-900 tabular-nums">
								<AnimatePresence initial={false} mode="popLayout">
									<motion.span
										key={visits}
										className="block"
										initial={{ y: 16, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										exit={{ y: -16, opacity: 0 }}
										transition={{ duration: 0.25 }}
									>
										{format.number(visits)}
									</motion.span>
								</AnimatePresence>
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

/** An address line that lights up when a visit comes through it. */
function Address({ highlighted, children }: { highlighted: boolean; children: ReactNode }) {
	return (
		<motion.p
			className="-mx-1.5 mt-1 rounded-md px-1.5 py-0.5 text-[13px] font-medium break-all text-slate-900"
			animate={{ backgroundColor: highlighted ? 'rgb(254 243 199)' : 'rgba(254, 243, 199, 0)' }}
			transition={{ duration: 0.3 }}
		>
			{children}
		</motion.p>
	);
}
