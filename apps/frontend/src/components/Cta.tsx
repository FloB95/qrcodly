'use client';

import { buttonVariants } from './ui/button';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Container from './ui/container';

export function Cta() {
	const t = useTranslations('contentElements.feedbackCta');

	return (
		<Container>
			<div className="sm:px-6 lg:px-8">
				<motion.div
					className="max-w-5xl mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc]"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<div className="flex flex-col items-center justify-center text-center py-12 px-5 xs:px-10 md:py-16 rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6]">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900">
							{t('headline')}
						</h2>
						<p className="text-slate-700 mt-3 md:text-lg max-w-xl">{t('subHeadline1')}</p>
						<div className="mt-8">
							<a href="mailto:info@qrcodly.de" className={buttonVariants({ size: 'lg' })}>
								<EnvelopeIcon className="mr-2 h-5 w-5" />
								{t('emailBtn')}
							</a>
						</div>
					</div>
				</motion.div>
			</div>
		</Container>
	);
}
