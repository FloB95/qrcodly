import React from 'react';
import { buttonVariants } from './ui/button';
import Link from 'next/link';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export const Cta = () => {
	const t = useTranslations('contentElements.feedbackCta');
	return (
		<div className="mx-auto mt-20 mb-14 text-center sm:mt-40 sm:mb-28">
			<h2 className="mb-4 text-4xl font-bold">{t('headline')}</h2>
			<p className="text-accent-foreground text-xl sm:text-2xl">
				{t('subHeadline1')}
				<br />
				{t('subHeadline2')}
			</p>
			<div className="mt-8 flex flex-wrap justify-center space-x-4">
				<Link href="https://github.com/FloB95/qrcodly" target="_blank" className={buttonVariants()}>
					<span className="mr-2 h-[24px] w-[24px]">
						<Image src="icons/github-logo.svg" width={24} height={24} alt="GitHub Logo" />
					</span>
					GitHub
				</Link>
				<Link href="mailto:info@qrcodly.de" target="_blank" className={buttonVariants()}>
					<span className="mr-2 h-[24px] w-[24px]">
						<EnvelopeIcon />
					</span>
					{t('emailBtn')}
				</Link>
			</div>
		</div>
	);
};
