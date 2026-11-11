import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { HostedPageView } from '@/components/hosted-page/registry';
import {
	demoPage,
	templateFromDemoSlug,
	templateTypeOf,
} from '@/components/products/hosted-pages/template-sample';

type DemoPageParams = { params: Promise<{ locale: string; slug: string }> };

const LANDING_PAGE = {
	pdf: '/products/hosted-pages/pdf#vorlagen',
	product: '/products/hosted-pages/digital-manual#vorlagen',
} as const;

async function resolve(params: DemoPageParams['params']) {
	const { locale, slug } = await params;
	const template = templateFromDemoSlug(slug);
	const type = template ? templateTypeOf(template) : null;
	if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(locale) || !template || !type)
		return null;
	return { locale, template, type };
}

export async function generateMetadata({ params }: DemoPageParams): Promise<Metadata> {
	const demo = await resolve(params);
	if (!demo) return {};
	const t = await getTranslations({ locale: demo.locale, namespace: 'hostedDemo' });
	const tTemplates = await getTranslations({
		locale: demo.locale,
		namespace: 'generator.contentSwitch.hosted.templates',
	});
	const name = tTemplates(`${demo.template}.name`);
	return {
		title: t('metaTitle', { name }),
		description: t(`metaDescription.${demo.type}`, { name }),
		// sample content only: the landing pages are what search engines should list
		robots: { index: false, follow: true },
	};
}

/** A template's sample page exactly as a visitor sees it after a scan, to click through. */
export default async function Page({ params }: DemoPageParams) {
	const demo = await resolve(params);
	if (!demo) notFound();
	const { locale, template, type } = demo;
	const t = await getTranslations({ locale, namespace: 'hostedDemo' });
	const tTemplates = await getTranslations({
		locale,
		namespace: 'generator.contentSwitch.hosted.templates',
	});
	const page = demoPage(template, tTemplates);
	if (!page) notFound();

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white backdrop-blur">
				<div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
					<Link
						href={LANDING_PAGE[type]}
						className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white sm:w-auto sm:gap-1.5 sm:px-2.5"
						aria-label={t('back')}
					>
						<ArrowLeftIcon className="size-4" aria-hidden="true" />
						<span className="hidden text-sm font-medium sm:inline">{t('back')}</span>
					</Link>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold tracking-wide text-slate-950 uppercase">
							{t('badge')}
						</span>
						<span className="truncate text-sm font-semibold">{tTemplates(`${template}.name`)}</span>
					</div>
					<Link
						href={`/?type=${type}&template=${template}#generator`}
						className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
					>
						<span className="sm:hidden">{t('ctaShort')}</span>
						<span className="hidden sm:inline">{t('cta')}</span>
					</Link>
				</div>
			</header>
			<main className="flex flex-1 flex-col">
				<HostedPageView page={page} />
			</main>
		</div>
	);
}
