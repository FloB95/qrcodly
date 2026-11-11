import { UseCasePage } from '@/components/products/UseCasePage';
import {
	QrCodeIcon,
	ChartBarIcon,
	MegaphoneIcon,
	ChatBubbleBottomCenterTextIcon,
	CurrencyDollarIcon,
	ShoppingCartIcon,
	CodeBracketIcon,
	BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import {
	URL_SHORTENER_USE_CASES,
	getUseCaseBySlug,
	type UseCaseDef,
	type UseCaseIconName,
} from '@/lib/use-case-pages';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { marketingMetadata } from '@/components/marketing/seo';
import type { Metadata } from 'next';
import type { SupportedLanguages } from '@/i18n/routing';

const ICON_COMPONENTS: Partial<
	Record<UseCaseIconName, React.ComponentType<{ className?: string }>>
> = {
	MegaphoneIcon,
	ChatBubbleBottomCenterTextIcon,
	CurrencyDollarIcon,
	ShoppingCartIcon,
	CodeBracketIcon,
	BuildingOffice2Icon,
};

/** Order of the use case cards on the parent page — sibling copy is reused from there. */
const SIBLING_INDEX_MAP: Record<string, number> = {
	'marketing-teams': 1,
	'social-media': 2,
	sales: 3,
	'e-commerce': 4,
	developers: 5,
	agencies: 6,
};

function renderSiblingIcon(useCase: UseCaseDef) {
	const Icon = ICON_COMPONENTS[useCase.iconName];
	return Icon ? <Icon className="h-5 w-5" /> : null;
}

type PageParams = {
	params: Promise<{ locale: SupportedLanguages; slug: string }>;
};

export async function generateStaticParams() {
	return URL_SHORTENER_USE_CASES.flatMap((uc) =>
		SUPPORTED_LANGUAGES.map((locale) => ({ locale, slug: uc.slug })),
	);
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
	const { locale, slug } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) return {};

	const useCase = getUseCaseBySlug(slug, URL_SHORTENER_USE_CASES);
	if (!useCase) return {};

	const t = await getTranslations({ locale, namespace: useCase.namespace });
	return marketingMetadata(locale, `products/url-shortener/${slug}`, {
		title: t('metaTitle'),
		description: t('metaDescription'),
	});
}

export default async function Page({ params }: PageParams) {
	const { locale, slug } = await params;
	if (!SUPPORTED_LANGUAGES.includes(locale)) notFound();

	const useCase = getUseCaseBySlug(slug, URL_SHORTENER_USE_CASES);
	if (!useCase) notFound();

	return (
		<UseCasePage
			locale={locale}
			useCase={useCase}
			collection={URL_SHORTENER_USE_CASES}
			parentNamespace="productsUrlShortener"
			siblingIndexMap={SIBLING_INDEX_MAP}
			renderSiblingIcon={renderSiblingIcon}
			crossProductCards={[
				{
					key: 'qrCodes',
					href: '/products/qr-codes',
					icon: <QrCodeIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
				},
				{
					key: 'analytics',
					href: '/products/analytics',
					icon: <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
				},
			]}
		/>
	);
}
