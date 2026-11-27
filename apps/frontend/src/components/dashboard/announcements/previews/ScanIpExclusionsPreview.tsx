'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { DevicePhoneMobileIcon, NoSymbolIcon, WifiIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { LoopProgress, useLoop, type LoopStep } from './use-loop';

type Source = 'office' | 'visitors';

type Scan = { id: number; source: Source; blocked: boolean };

type State = {
	scans: number;
	excluded: boolean;
	scan: Scan | null;
	/** A scan was just stopped at the exclusion. */
	stopped: boolean;
	nextId: number;
};

type Step = LoopStep<State>;

/** Documentation range, the same example the settings page uses. */
const IP_RANGE = '203.0.113.0/24';
const SCANS = 248;
const TRAVEL_MS = 900;
/** Where on its track a scan from an excluded network stops. */
const GATE = '62%';
const START: State = { scans: SCANS, excluded: false, scan: null, stopped: false, nextId: 0 };
const END: State = { ...START, excluded: true, scans: SCANS + 2 };

function scanFrom(source: Source, gap: number): Step[] {
	return [
		[
			gap,
			(s) => ({
				...s,
				scan: { id: s.nextId, source, blocked: s.excluded && source === 'office' },
				nextId: s.nextId + 1,
			}),
		],
		[
			TRAVEL_MS,
			(s) => {
				const blocked = s.scan?.blocked ?? false;
				return { ...s, scan: null, stopped: blocked, scans: blocked ? s.scans : s.scans + 1 };
			},
		],
		[650, (s) => ({ ...s, stopped: false })],
	];
}

/** One loop: office and visitors both count, the office network is excluded, only visitors count. */
const STEPS: Step[] = [
	[600, (s) => s],
	...scanFrom('office', 0),
	...scanFrom('visitors', 150),
	...scanFrom('office', 150),
	[500, (s) => ({ ...s, excluded: true })],
	...scanFrom('office', 900),
	...scanFrom('visitors', 150),
	...scanFrom('office', 150),
	[2200, () => START],
];

/** Scans from the office stop counting once its network is excluded; visitors still count. */
export function ScanIpExclusionsPreview() {
	const t = useTranslations('announcements.items.scanIpExclusions.preview');
	const format = useFormatter();
	const { state, round, durationMs, animate } = useLoop(STEPS, START, END);
	const { scans, excluded, scan, stopped } = state;

	const track = (source: Source) => (
		<div className="relative h-6">
			<div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300" />
			{source === 'office' && (
				<>
					<AnimatePresence>
						{excluded && (
							<motion.span
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0, opacity: 0 }}
								transition={{ type: 'spring', stiffness: 420, damping: 22 }}
								className="absolute top-1/2 -mt-3 -ml-3 flex size-6 items-center justify-center rounded-full border border-red-200 bg-white"
								style={{ left: GATE }}
							>
								<NoSymbolIcon className="size-4 text-red-500" />
							</motion.span>
						)}
					</AnimatePresence>
					<AnimatePresence>
						{stopped && (
							<motion.span
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="absolute -top-4 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap text-red-600"
								style={{ left: GATE }}
							>
								{t('notCounted')}
							</motion.span>
						)}
					</AnimatePresence>
				</>
			)}
			{scan?.source === source && (
				<motion.span
					key={scan.id}
					className={cn(
						'absolute top-1/2 -mt-1.5 -ml-1.5 size-3 rounded-full',
						source === 'office' ? 'bg-amber-400' : 'bg-teal-600',
					)}
					initial={{ left: '0%', opacity: 0 }}
					animate={
						scan.blocked
							? { left: ['0%', GATE, GATE], opacity: [0, 1, 0], scale: [1, 1, 1.8] }
							: { left: ['0%', '100%'], opacity: [0, 1] }
					}
					transition={{
						duration: TRAVEL_MS / 1000,
						ease: 'easeInOut',
						times: scan.blocked ? [0, 0.7, 1] : undefined,
					}}
				/>
			)}
		</div>
	);

	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(var(--color-slate-200)_1px,transparent_1px)] [background-size:16px_16px] p-6"
		>
			<LoopProgress round={round} durationMs={durationMs} animate={animate} />
			<div className="w-full max-w-[400px]">
				<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4">
					<Source icon={WifiIcon} label={t('office')} />
					{track('office')}
					<div className="row-span-2 rounded-xl border bg-white px-4 py-3 text-left shadow-sm">
						<p className="text-[11px] text-muted-foreground">{t('scans')}</p>
						<p className="relative h-7 overflow-hidden text-2xl leading-7 font-semibold text-slate-900 tabular-nums">
							<AnimatePresence initial={false} mode="popLayout">
								<motion.span
									key={scans}
									className="block"
									initial={{ y: 18, opacity: 0 }}
									animate={{ y: 0, opacity: 1 }}
									exit={{ y: -18, opacity: 0 }}
									transition={{ duration: 0.25 }}
								>
									{format.number(scans)}
								</motion.span>
							</AnimatePresence>
						</p>
					</div>
					<Source icon={DevicePhoneMobileIcon} label={t('visitors')} />
					{track('visitors')}
				</div>

				<div className="mt-5 h-11">
					<AnimatePresence>
						{excluded && (
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.3 }}
								className="flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-left text-xs shadow-sm"
							>
								<NoSymbolIcon className="size-4 shrink-0 text-red-500" />
								<span className="font-medium text-slate-900 tabular-nums">{IP_RANGE}</span>
								<span className="truncate text-muted-foreground">{t('office')}</span>
								<span className="ml-auto shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
									{t('excluded')}
								</span>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}

function Source({ icon: Icon, label }: { icon: typeof WifiIcon; label: string }) {
	return (
		<span className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
			<Icon className="size-4 text-slate-500" />
			{label}
		</span>
	);
}
