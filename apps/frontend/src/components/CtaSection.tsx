import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AnimateOnScroll } from './features/AnimateOnScroll';

export async function CtaSection() {
	const t = await getTranslations('featuresPage');

	return (
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="max-w-5xl mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc]">
						<div className="flex flex-col items-center justify-center text-center py-12 px-5 xs:px-10 md:py-16 rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6]">
							<h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
								{t('cta.title')}
							</h2>
							<p className="text-slate-700 mt-3 md:text-lg max-w-xl">{t('cta.subtitle')}</p>
							<div className="mt-8">
								<Link href="/#generator" className={buttonVariants({ size: 'lg' })}>
									{t('cta.button')}
								</Link>
							</div>
						</div>
					</AnimateOnScroll>
				</div>
			</Container>
		</div>
	);
}
