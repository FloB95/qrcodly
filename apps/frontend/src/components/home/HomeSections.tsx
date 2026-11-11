import Image from 'next/image';
import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ComponentType } from 'react';
import {
	AcademicCapIcon,
	ArrowRightIcon,
	ArrowUpRightIcon,
	SwatchIcon,
	BuildingOffice2Icon,
	BuildingStorefrontIcon,
	ChatBubbleBottomCenterTextIcon,
	CodeBracketIcon,
	CommandLineIcon,
	CurrencyDollarIcon,
	HomeModernIcon,
	MegaphoneIcon,
	ShoppingBagIcon,
	ShoppingCartIcon,
	TicketIcon,
} from '@heroicons/react/24/outline';
import Container from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { SectionHead, cardClass } from '@/components/marketing/SectionHead';
import {
	QR_CODE_USE_CASES,
	URL_SHORTENER_USE_CASES,
	type UseCaseIconName,
} from '@/lib/use-case-pages';
import { CHROME_EXTENSION_URL, INTEGRATIONS_CATALOG } from '@/lib/integrations-catalog';
import { cn } from '@/lib/utils';

const USE_CASE_ICONS: Record<UseCaseIconName, ComponentType<{ className?: string }>> = {
	BuildingStorefrontIcon,
	ShoppingBagIcon,
	TicketIcon,
	HomeModernIcon,
	AcademicCapIcon,
	MegaphoneIcon,
	ChatBubbleBottomCenterTextIcon,
	CurrencyDollarIcon,
	ShoppingCartIcon,
	CodeBracketIcon,
	BuildingOffice2Icon,
};

/** Every solution page, grouped by product — the home page is their strongest internal link. */
export async function HomeSolutions({ locale }: { locale: string }) {
	const t = await getTranslations({ locale, namespace: 'home.solutions' });
	const m = await getTranslations({ locale, namespace: 'marketing' });
	const qr = await getTranslations({ locale, namespace: 'productsQrCodes' });
	const url = await getTranslations({ locale, namespace: 'productsUrlShortener' });

	const groups = [
		{ label: qr('badge'), href: '/products/qr-codes', t: qr, cases: QR_CODE_USE_CASES },
		{
			label: url('badge'),
			href: '/products/url-shortener',
			t: url,
			cases: URL_SHORTENER_USE_CASES,
		},
	];

	return (
		<section className="-mx-4 my-8 bg-slate-900 py-16 text-white sm:mx-0 sm:my-12 sm:py-24">
			<Container>
				<div className="px-4 sm:px-6 lg:px-8">
					<SectionHead
						eyebrow={m('eyebrow.useCases')}
						title={t('title')}
						subtitle={t('subtitle')}
						dark
					/>
					<div className="flex flex-col gap-10">
						{groups.map((group) => (
							<div key={group.href} className="flex flex-col gap-4">
								<Link
									href={group.href}
									className="group inline-flex items-center gap-2 self-start font-mono text-xs font-medium tracking-[0.16em] text-amber-400 uppercase"
								>
									{group.label}
									<ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
								</Link>
								<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{group.cases.map((useCase, i) => {
										const Icon = USE_CASE_ICONS[useCase.iconName];
										return (
											<li key={useCase.slug}>
												<Link
													href={`${useCase.parentPath}/${useCase.slug}`}
													className="group flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
												>
													<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-slate-200 ring-1 ring-white/10 transition-colors ring-inset group-hover:bg-amber-400 group-hover:text-slate-900 group-hover:ring-amber-400">
														<Icon className="size-5" />
													</span>
													<span className="min-w-0 flex-1 text-[15px] font-semibold">
														{group.t(`useCases.case${i + 1}Title`)}
													</span>
													<ArrowRightIcon className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
												</Link>
											</li>
										);
									})}
								</ul>
							</div>
						))}
					</div>
				</div>
			</Container>
		</section>
	);
}

const catalogHref = (id: string) => {
	const entry = INTEGRATIONS_CATALOG.find((item) => item.id === id);
	return entry?.kind === 'external-link' ? entry.href : undefined;
};

/** Where QRcodly plugs into existing tools; only integrations that exist today. */
export async function HomeIntegrations({ locale }: { locale: string }) {
	const t = await getTranslations({ locale, namespace: 'home.integrations' });
	const c = await getTranslations({ locale, namespace: 'settings.integrations.catalog' });
	const qr = await getTranslations({ locale, namespace: 'productsQrCodes' });

	const items = [
		{
			name: c('browserExtensionChrome.name'),
			description: c('browserExtensionChrome.description'),
			logo: '/images/integrations/chrome.png',
			href: CHROME_EXTENSION_URL,
			cta: c('browserExtensionChrome.cta'),
		},
		{
			name: c('adobeIndesign.name'),
			description: c('adobeIndesign.description'),
			// Adobe allows its product icons only with approval; neutral until Adobe answers
			icon: SwatchIcon,
			href: catalogHref('adobe-indesign'),
			cta: c('adobeIndesign.cta'),
			pro: true,
		},
		{
			name: c('googleAnalytics.name'),
			description: c('googleAnalytics.description'),
			logo: '/images/integrations/google-analytics.svg',
			pro: true,
		},
		{
			name: c('matomo.name'),
			description: c('matomo.description'),
			logo: '/images/integrations/matomo.svg',
			pro: true,
		},
	];

	return (
		<section className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<SectionHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{items.map((item) => (
							<div key={item.name} className={cn(cardClass, 'flex flex-col gap-3 p-6')}>
								<span className="flex items-center justify-between gap-3">
									{item.logo ? (
										<Image
											src={item.logo}
											alt=""
											width={36}
											height={36}
											className="size-9 object-contain"
										/>
									) : item.icon ? (
										<span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
											<item.icon className="size-5" />
										</span>
									) : null}
									{item.pro && (
										<span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
											Pro
										</span>
									)}
								</span>
								<h3 className="text-lg font-bold tracking-tight text-slate-900">{item.name}</h3>
								<p className="text-[15px] leading-relaxed text-slate-600">{item.description}</p>
								{item.href && item.cta && (
									<a
										href={item.href}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-auto inline-flex items-center gap-1.5 self-start pt-1 text-sm font-semibold text-slate-900"
									>
										{item.cta}
										<ArrowUpRightIcon className="size-3.5" />
									</a>
								)}
							</div>
						))}
						<div className="flex flex-col gap-3 rounded-[22px] bg-slate-900 p-6 text-white sm:col-span-2 lg:col-span-2">
							<span className="flex items-center justify-between gap-3">
								<span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-amber-300">
									<CommandLineIcon className="size-5" />
								</span>
								<span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
									Pro
								</span>
							</span>
							<h3 className="text-lg font-bold tracking-tight">{qr('features.apiAccess.title')}</h3>
							<p className="max-w-2xl text-[15px] leading-relaxed text-slate-300">{t('api')}</p>
							<NextLink
								href="/docs/api"
								className="mt-auto inline-flex items-center gap-1.5 self-start pt-1 text-sm font-semibold text-amber-300"
							>
								{qr('features.apiAccess.actionLabel')}
								<ArrowRightIcon className="size-3.5" />
							</NextLink>
						</div>
					</div>
				</div>
			</Container>
		</section>
	);
}
