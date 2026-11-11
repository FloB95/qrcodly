'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
	AdjustmentsHorizontalIcon,
	CodeBracketIcon,
	CreditCardIcon,
	EllipsisVerticalIcon,
	EyeIcon,
	FunnelIcon,
	GlobeAltIcon,
	LinkIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	PuzzlePieceIcon,
	QrCodeIcon,
	ShieldCheckIcon,
	StarIcon,
	TagIcon,
	UserIcon,
} from '@heroicons/react/24/outline';
import type { TQrCodeContentType } from '@shared/schemas';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { QrCodeIcon as ContentTypeIcon } from '@/components/dashboard/qrCode/QrCodeIcon';
import { BrandQr } from '@/components/products/mockups/BrandQr';
import { cn } from '@/lib/utils';

export type DashboardView = 'qrCodes' | 'shortUrls' | 'templates';
export const DASHBOARD_VIEWS: DashboardView[] = ['qrCodes', 'shortUrls', 'templates'];

const TAGS = {
	t1: '#f59e0b',
	t2: '#3b82f6',
	t3: '#8b5cf6',
	t4: '#10b981',
} as const;

type QrRow = {
	key: string;
	type: TQrCodeContentType;
	tag: keyof typeof TAGS;
	qr: string;
	short?: string;
	dest: string;
	scans?: number;
	created: string;
};

/** Sample data: names come from `home.dashboard.rows`, the rest is decoration. */
const QR_ROWS: QrRow[] = [
	{
		key: 'r1',
		type: 'pdf',
		tag: 't1',
		qr: 'text-amber-800',
		short: 'k3m9x',
		dest: 'menu-autumn.pdf',
		scans: 1284,
		created: '2026-10-02T09:14:00',
	},
	{
		key: 'r2',
		type: 'url',
		tag: 't2',
		qr: 'text-slate-900',
		short: 'r7d2q',
		dest: 'expo.example/booth',
		scans: 612,
		created: '2026-09-18T15:40:00',
	},
	{
		key: 'r3',
		type: 'vCard',
		tag: 't3',
		qr: 'text-indigo-700',
		dest: 'Anna Weber',
		created: '2026-09-03T11:05:00',
	},
	{
		key: 'r4',
		type: 'url',
		tag: 't4',
		qr: 'text-emerald-700',
		short: 'b9t4k',
		dest: 'shop.example/sale',
		scans: 2047,
		created: '2026-08-21T08:30:00',
	},
];

const LINK_ROWS = [
	{
		key: 'l1',
		short: 'n4c8w',
		dest: 'shop.example/newsletter/october',
		views: 938,
		created: '2026-10-05T10:00:00',
	},
	{
		key: 'l2',
		short: 'h2v6p',
		dest: 'studio.example/links',
		views: 4310,
		created: '2026-07-12T18:22:00',
	},
	{
		key: 'l3',
		short: 'q7m1z',
		dest: 'docs.example/offer-2027.pdf',
		views: 12,
		created: '2026-10-28T14:47:00',
	},
] as const;

const TEMPLATE_ROWS = [
	{ key: 't1', qr: 'text-slate-900', bg: 'bg-slate-100', created: '2026-06-02T09:00:00' },
	{ key: 't2', qr: 'text-amber-800', bg: 'bg-amber-50', created: '2026-08-14T16:10:00' },
	{ key: 't3', qr: 'text-indigo-700', bg: 'bg-indigo-50', created: '2026-09-29T12:35:00' },
] as const;

const COUNTS = { qrCodes: 24, shortUrls: 9, templates: 3 };

/** Types a query into the search field; the QR list filters as it grows, then clears again. */
function useTypedQuery(target: string, active: boolean) {
	const [length, setLength] = useState(0);
	useEffect(() => {
		setLength(0);
		if (!active) return;
		let i = 0;
		let timer: ReturnType<typeof setTimeout>;
		const step = () => {
			i += 1;
			setLength(i);
			// hold the filtered result briefly, then clear so the full list comes back
			timer = i < target.length ? setTimeout(step, 110) : setTimeout(() => setLength(0), 1800);
		};
		timer = setTimeout(step, 1200);
		return () => clearTimeout(timer);
	}, [target, active]);
	return target.slice(0, length);
}

function NavItem({
	icon: Icon,
	label,
	count,
	active,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	count?: number;
	active?: boolean;
}) {
	return (
		<span
			className={cn(
				'flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-300',
				active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
			)}
		>
			<Icon className="size-4 shrink-0" />
			<span className="truncate">{label}</span>
			{count !== undefined && <span className="ml-auto text-xs tabular-nums">{count}</span>}
		</span>
	);
}

function PageHeader({
	icon: Icon,
	title,
	description,
	action,
}: {
	icon: ComponentType<{ className?: string }>;
	title: string;
	description: string;
	action: string;
}) {
	return (
		<Card className="py-5">
			<CardContent className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<div className="rounded-lg bg-primary/10 p-3">
						<Icon className="size-6 stroke-1 sm:size-8" />
					</div>
					<div className="min-w-0">
						<CardTitle className="mb-0.5">{title}</CardTitle>
						<CardDescription className="hidden sm:block">{description}</CardDescription>
					</div>
				</div>
				<span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
					<PlusIcon className="size-4" />
					<span className="hidden lg:inline">{action}</span>
				</span>
			</CardContent>
		</Card>
	);
}

function SearchBar({
	value,
	placeholder,
	filters,
}: {
	value: string;
	placeholder: string;
	filters?: string[];
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-white px-3 text-sm sm:max-w-xs">
				<MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" />
				{value ? (
					<span className="truncate">
						{value}
						<span className="ml-px inline-block h-3.5 w-px animate-pulse bg-foreground align-middle" />
					</span>
				) : (
					<span className="truncate text-muted-foreground">{placeholder}</span>
				)}
			</span>
			{filters?.map((filter, i) => (
				<span
					key={filter}
					className="hidden h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium md:inline-flex"
				>
					{i === 0 ? <FunnelIcon className="size-4" /> : <TagIcon className="size-4" />}
					{filter}
				</span>
			))}
		</div>
	);
}

/** The QRcodly dashboard rebuilt from the dashboard's own UI parts; localised, no account data. */
export function DashboardScene({
	view = 'qrCodes',
	animate = false,
	className,
}: {
	view?: DashboardView;
	/** Types a search into the QR list; off for static placements. */
	animate?: boolean;
	className?: string;
}) {
	const t = useTranslations();
	const locale = useLocale();
	const number = new Intl.NumberFormat(locale);
	const date = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' });
	const r = (key: string) => t(`home.dashboard.rows.${key}`);

	const target = r('r1.name').split(' ')[0] ?? '';
	const query = useTypedQuery(target, animate && view === 'qrCodes');
	const qrRows = QR_ROWS.filter((row) =>
		r(`${row.key}.name`).toLowerCase().includes(query.toLowerCase()),
	);

	const settings = [
		{ icon: UserIcon, label: t('settings.nav.profile') },
		{ icon: ShieldCheckIcon, label: t('settings.nav.security') },
		{ icon: CreditCardIcon, label: t('settings.nav.billing') },
		{ icon: CodeBracketIcon, label: t('settings.nav.apiKeys') },
		{ icon: GlobeAltIcon, label: t('settings.nav.domains') },
		{ icon: PuzzlePieceIcon, label: t('settings.nav.integrations') },
	];

	const statusBadge = (
		<Badge variant="blue" className="text-xs">
			{t('analytics.stateActive')}
		</Badge>
	);
	const rowCheckbox = (
		<TableCell className="w-[40px] py-2 pr-0">
			<Checkbox tabIndex={-1} />
		</TableCell>
	);
	const actions = (
		<TableCell className="w-[60px] px-2 py-2">
			<EllipsisVerticalIcon className="size-5 text-muted-foreground" />
		</TableCell>
	);

	return (
		<div role="img" aria-label={t('home.dashboard.aria')} className={className}>
			<div
				inert
				className="pointer-events-none flex overflow-hidden rounded-[22px] border border-stone-200 bg-sidebar text-left shadow-[0_40px_90px_-50px_rgba(15,23,42,0.55)] select-none"
			>
				<aside className="hidden w-[220px] shrink-0 flex-col gap-4 px-2 pt-5 pb-4 text-sidebar-foreground lg:flex">
					<div className="ml-2 font-semibold">Dashboard</div>
					<div className="flex flex-col gap-0.5">
						<span className="flex h-8 items-center px-2 text-xs font-medium text-sidebar-foreground/70">
							{t('dashboard.nav.collection')}
						</span>
						<NavItem
							icon={QrCodeIcon}
							label={t('dashboard.nav.qrCodes')}
							count={COUNTS.qrCodes}
							active={view === 'qrCodes'}
						/>
						<span className="mx-3.5 flex flex-col gap-0.5 border-l border-sidebar-border px-2.5 py-0.5">
							{Object.entries(TAGS).map(([key, color]) => (
								<span key={key} className="flex h-7 items-center gap-2 rounded-md px-2 text-sm">
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: color }}
									/>
									<span className="truncate">{r(`r${key.slice(1)}.tag`)}</span>
								</span>
							))}
						</span>
						<NavItem
							icon={LinkIcon}
							label={t('dashboard.nav.shortUrls')}
							count={COUNTS.shortUrls}
							active={view === 'shortUrls'}
						/>
						<NavItem
							icon={StarIcon}
							label={t('dashboard.nav.templates')}
							count={COUNTS.templates}
							active={view === 'templates'}
						/>
						<NavItem icon={TagIcon} label={t('dashboard.nav.tags')} count={4} />
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="flex h-8 items-center px-2 text-xs font-medium text-sidebar-foreground/70">
							{t('settings.nav.title')}
						</span>
						{settings.map((item) => (
							<NavItem key={item.label} icon={item.icon} label={item.label} />
						))}
					</div>
				</aside>

				<div className="@container m-2 flex min-h-[480px] min-w-0 flex-1 flex-col gap-4 rounded-xl bg-background p-3 shadow sm:p-5 lg:ml-0">
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={view}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.25 }}
							className="flex flex-col gap-4"
						>
							{view === 'qrCodes' && (
								<>
									<PageHeader
										icon={QrCodeIcon}
										title={t('collection.tabQrCode')}
										description={t('collection.subHeadline')}
										action={t('collection.addQrCodeBtn')}
									/>
									<SearchBar
										value={query}
										placeholder={t('collection.filters.searchPlaceholder')}
										filters={[t('collection.filters.contentType'), t('dashboard.nav.tags')]}
									/>
									<div className="overflow-hidden rounded-lg border">
										<Table>
											<TableHeader className="bg-muted">
												<TableRow>
													<TableHead className="w-[40px] pr-0">
														<Checkbox tabIndex={-1} />
													</TableHead>
													<TableHead className="w-[60px]">{t('qrCode.table.preview')}</TableHead>
													<TableHead>{t('qrCode.table.name')}</TableHead>
													<TableHead className="hidden @3xl:table-cell">
														{t('qrCode.table.content')}
													</TableHead>
													<TableHead className="hidden @lg:table-cell">
														{t('qrCode.table.status')}
													</TableHead>
													<TableHead className="hidden @md:table-cell">
														{t('qrCode.table.scans')}
													</TableHead>
													<TableHead className="hidden @5xl:table-cell">
														{t('qrCode.table.created')}
													</TableHead>
													<TableHead className="w-[60px] px-2" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{qrRows.map((row) => (
													<TableRow key={row.key}>
														{rowCheckbox}
														<TableCell className="w-[72px] py-2 pr-2">
															<span className="flex size-12 items-center justify-center rounded bg-white sm:size-14">
																<BrandQr className={cn('size-11 sm:size-12', row.qr)} />
															</span>
														</TableCell>
														<TableCell className="max-w-[280px] py-2">
															<div className="flex min-w-0 items-center gap-2">
																<ContentTypeIcon type={row.type} />
																<div className="flex min-w-0 flex-col gap-1">
																	<div className="flex min-w-0 items-center gap-2">
																		<span className="max-w-[200px] truncate text-sm font-medium">
																			{r(`${row.key}.name`)}
																		</span>
																		{row.short && (
																			<Badge
																				variant="outline"
																				className="shrink-0 border-teal-600 px-1.5 py-0 text-[10px] text-teal-700"
																			>
																				Dynamic
																			</Badge>
																		)}
																	</div>
																	<Badge
																		className="h-5 max-w-[140px] shrink-0 gap-1 self-start border-0 px-1.5 py-0 text-[10px]"
																		style={{ backgroundColor: TAGS[row.tag], color: '#fff' }}
																	>
																		<TagIcon className="size-3 shrink-0" />
																		<span className="truncate">{r(`${row.key}.tag`)}</span>
																	</Badge>
																</div>
															</div>
														</TableCell>
														<TableCell className="hidden max-w-[250px] py-2 @3xl:table-cell">
															{row.short ? (
																<div className="flex min-w-0 flex-col text-sm">
																	<span className="truncate text-muted-foreground">
																		https://qrcodly.de/u/{row.short}
																	</span>
																	<span className="truncate">↳ {row.dest}</span>
																</div>
															) : (
																<span className="block truncate text-sm">{row.dest}</span>
															)}
														</TableCell>
														<TableCell className="hidden py-2 @lg:table-cell">
															{row.short && statusBadge}
														</TableCell>
														<TableCell className="hidden py-2 @md:table-cell">
															{row.scans !== undefined && (
																<span className="flex items-center gap-1 text-sm">
																	<EyeIcon className="size-3.5 text-muted-foreground" />
																	{number.format(row.scans)}
																</span>
															)}
														</TableCell>
														<TableCell className="hidden py-2 text-sm @5xl:table-cell">
															{date.format(new Date(row.created))}
														</TableCell>
														{actions}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</>
							)}

							{view === 'shortUrls' && (
								<>
									<PageHeader
										icon={LinkIcon}
										title={t('shortUrl.title')}
										description={t('shortUrl.description')}
										action={t('shortUrl.createBtn')}
									/>
									<SearchBar
										value=""
										placeholder={t('shortUrl.searchPlaceholder')}
										filters={[t('qrCode.table.status'), t('dashboard.nav.tags')]}
									/>
									<div className="overflow-hidden rounded-lg border">
										<Table>
											<TableHeader className="bg-muted">
												<TableRow>
													<TableHead className="w-[40px] pr-0">
														<Checkbox tabIndex={-1} />
													</TableHead>
													<TableHead>{t('shortUrl.table.name')}</TableHead>
													<TableHead className="hidden @2xl:table-cell">
														{t('shortUrl.table.content')}
													</TableHead>
													<TableHead>{t('shortUrl.table.status')}</TableHead>
													<TableHead className="hidden @md:table-cell">
														{t('shortUrl.table.views')}
													</TableHead>
													<TableHead className="hidden @4xl:table-cell">
														{t('shortUrl.table.created')}
													</TableHead>
													<TableHead className="w-[60px] px-2" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{LINK_ROWS.map((row) => (
													<TableRow key={row.key}>
														{rowCheckbox}
														<TableCell className="py-3">
															<div className="flex min-w-0 flex-col gap-0.5">
																<span className="truncate text-sm font-medium">
																	{r(`${row.key}.name`)}
																</span>
																<span className="truncate text-xs text-muted-foreground @2xl:hidden">
																	qrcodly.de/u/{row.short}
																</span>
															</div>
														</TableCell>
														<TableCell className="hidden max-w-[260px] py-3 @2xl:table-cell">
															<div className="flex min-w-0 flex-col text-sm">
																<span className="truncate text-muted-foreground">
																	https://qrcodly.de/u/{row.short}
																</span>
																<span className="truncate">↳ {row.dest}</span>
															</div>
														</TableCell>
														<TableCell className="py-3">{statusBadge}</TableCell>
														<TableCell className="hidden py-3 @md:table-cell">
															<span className="flex items-center gap-1 text-sm">
																<EyeIcon className="size-3.5 text-muted-foreground" />
																{number.format(row.views)}
															</span>
														</TableCell>
														<TableCell className="hidden py-3 text-sm @4xl:table-cell">
															{date.format(new Date(row.created))}
														</TableCell>
														{actions}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</>
							)}

							{view === 'templates' && (
								<>
									<PageHeader
										icon={StarIcon}
										title={t('collection.tabTemplates')}
										description={t('templates.pageDescription')}
										action={t('collection.addTemplateBtn')}
									/>
									<SearchBar value="" placeholder={t('templates.search.placeholder')} />
									<div className="overflow-hidden rounded-lg border">
										<Table>
											<TableHeader className="bg-muted">
												<TableRow>
													<TableHead className="w-[40px] pr-0">
														<Checkbox tabIndex={-1} />
													</TableHead>
													<TableHead className="w-[72px]">{t('qrCode.table.preview')}</TableHead>
													<TableHead>{t('qrCode.table.name')}</TableHead>
													<TableHead className="hidden @md:table-cell">
														{t('qrCode.table.created')}
													</TableHead>
													<TableHead className="w-[60px] px-2" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{TEMPLATE_ROWS.map((row) => (
													<TableRow key={row.key}>
														{rowCheckbox}
														<TableCell className="w-[72px] py-2 pr-2">
															<span
																className={cn(
																	'flex size-12 items-center justify-center rounded sm:size-14',
																	row.bg,
																)}
															>
																<BrandQr className={cn('size-10 sm:size-11', row.qr)} />
															</span>
														</TableCell>
														<TableCell className="py-2">
															<span className="truncate text-sm font-medium">
																{r(`${row.key}.name`)}
															</span>
														</TableCell>
														<TableCell className="hidden py-2 text-sm @md:table-cell">
															{date.format(new Date(row.created))}
														</TableCell>
														{actions}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</>
							)}
						</motion.div>
					</AnimatePresence>
					<div className="mt-auto hidden items-center justify-end gap-2 text-sm text-muted-foreground sm:flex">
						<AdjustmentsHorizontalIcon className="size-4" />
						{t('bulkActions.rowsPerPage')}: 10
					</div>
				</div>
			</div>
		</div>
	);
}

const VIEW_DURATION = 6500;

/** Tabs above the scene; they advance on their own until someone picks one. */
export function DashboardShowcase({ className }: { className?: string }) {
	const t = useTranslations('home.dashboard.views');
	const reduceMotion = useReducedMotion();
	const [view, setView] = useState<DashboardView>('qrCodes');
	const [auto, setAuto] = useState(true);

	useEffect(() => {
		if (!auto || reduceMotion) return;
		const timer = setTimeout(() => {
			setView(
				(current) =>
					DASHBOARD_VIEWS[(DASHBOARD_VIEWS.indexOf(current) + 1) % DASHBOARD_VIEWS.length]!,
			);
		}, VIEW_DURATION);
		return () => clearTimeout(timer);
	}, [view, auto, reduceMotion]);

	return (
		<div className={cn('flex flex-col gap-6', className)}>
			<div role="tablist" className="grid grid-cols-3 gap-2 sm:gap-3">
				{DASHBOARD_VIEWS.map((item) => {
					const active = item === view;
					return (
						<button
							key={item}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => {
								setView(item);
								setAuto(false);
							}}
							className={cn(
								'relative flex flex-col gap-1 overflow-hidden rounded-2xl border p-3 text-left transition-colors sm:p-4',
								active
									? 'border-slate-900 bg-white'
									: 'border-stone-200 bg-white/60 hover:bg-white',
							)}
						>
							<span className="text-[13px] font-bold tracking-tight text-slate-900 sm:text-[15px]">
								{t(`${item}.title`)}
							</span>
							<span className="hidden text-[13px] leading-snug text-slate-600 sm:block">
								{t(`${item}.text`)}
							</span>
							{active && auto && !reduceMotion && (
								<motion.span
									key={view}
									className="absolute bottom-0 left-0 h-0.5 bg-slate-900"
									initial={{ width: '0%' }}
									animate={{ width: '100%' }}
									transition={{ duration: VIEW_DURATION / 1000, ease: 'linear' }}
								/>
							)}
						</button>
					);
				})}
			</div>
			<DashboardScene view={view} animate={!reduceMotion} />
		</div>
	);
}
