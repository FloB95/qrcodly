'use client';

import { PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { Heading } from '@/components/ui/heading';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Container from './ui/container';

export function BrowserExtensionTeaser() {
	const t = useTranslations('contentElements.browserExtensionTeaser');

	return (
		<Container>
			<div className="sm:px-6 lg:px-8">
				<motion.div
					className="max-w-5xl mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc] dark:from-border dark:to-border"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
				>
					<div className="relative overflow-hidden rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6] dark:bg-none dark:bg-card">
						{/* Decorative puzzle outlines */}
						<div className="absolute inset-0 pointer-events-none" aria-hidden="true">
							<PuzzlePieceIcon className="absolute -top-3 -right-3 w-24 sm:w-28 text-foreground/[0.06] rotate-12" />
							<PuzzlePieceIcon className="absolute -bottom-4 -left-2 w-20 sm:w-24 text-foreground/[0.05] -rotate-[25deg]" />
							<PuzzlePieceIcon className="absolute top-1/2 -translate-y-1/2 right-[15%] w-14 text-foreground/[0.05] rotate-45 hidden sm:block" />
						</div>

						{/* Content */}
						<div className="relative flex flex-col items-center justify-center text-center py-12 px-5 xs:px-10 md:py-16">
							<span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white mb-5 dark:bg-primary dark:text-primary-foreground">
								{t('badge')}
							</span>
							<Heading as="h2" size="lg">
								{t('headline')}
							</Heading>
							<p className="text-muted-foreground mt-3 md:text-lg max-w-xl">{t('description')}</p>
						</div>
					</div>
				</motion.div>
			</div>
		</Container>
	);
}
