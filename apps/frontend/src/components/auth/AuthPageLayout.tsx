import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Container from '@/components/ui/container';
import { Check, Eyebrow, cardClass } from '@/components/marketing/SectionHead';
import { cn } from '@/lib/utils';

const BENEFITS = ['unlimited', 'dynamic', 'statistics', 'noCreditCard'] as const;

/** Sign-in and sign-up: product promise on the left, Clerk card on the right (first on phones). */
export async function AuthPageLayout({
	locale,
	flow,
	children,
}: {
	locale: string;
	flow: 'signIn' | 'signUp';
	children: ReactNode;
}) {
	const t = await getTranslations({ locale, namespace: 'auth' });

	return (
		<>
			<Header hideSignInButton />
			<Container disableOverflow>
				<div className="grid grid-cols-1 items-center gap-10 py-10 sm:px-6 sm:py-16 lg:min-h-[44rem] lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16 lg:px-8 xl:gap-20">
					<div className="order-last mx-auto flex w-full max-w-[25rem] min-w-0 flex-col gap-6 lg:order-first lg:mx-0 lg:max-w-none">
						<span className="self-start rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-900 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]">
							{t(`${flow}.eyebrow`)}
						</span>
						<h1 className="text-3xl leading-[1.08] font-extrabold tracking-tight text-balance hyphens-auto text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.05]">
							{t(`${flow}.title`)}
						</h1>
						<p className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
							{t(`${flow}.subtitle`)}
						</p>
						<div className={cn(cardClass, 'flex max-w-lg flex-col gap-4 p-6 sm:p-7')}>
							<Eyebrow>{t('benefitsTitle')}</Eyebrow>
							<ul className="flex flex-col gap-3">
								{BENEFITS.map((key) => (
									<li key={key} className="flex items-start gap-3 text-[15px] text-slate-700">
										<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-50">
											<Check className="size-3 text-teal-600" />
										</span>
										{t(`benefits.${key}`)}
									</li>
								))}
							</ul>
						</div>
					</div>
					{/* min-h keeps the footer in place until Clerk has rendered the card */}
					<div className="flex min-h-[30rem] items-center justify-center">{children}</div>
				</div>
			</Container>
			<Footer />
		</>
	);
}
