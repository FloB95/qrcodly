import React from 'react';
import { buttonVariants } from './ui/button';
import Link from 'next/link';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export const Cta2 = () => {
	const t = useTranslations('contentElements.feedbackCta');
	return (
		<div className="mx-auto mt-24 text-center sm:mt-50">
			<h2 className="mb-4 text-2xl sm:text-4xl font-bold">{t('headline')}</h2>
			<p className="text-accent-foreground text-xl sm:text-2xl">
				{t('subHeadline1')}
				<br />
				{t('subHeadline2')}
			</p>
			<div className="mt-8 flex flex-wrap justify-center space-x-4">
				<Link href="https://github.com/FloB95/qrcodly" target="_blank" className={buttonVariants()}>
					<span className="mr-2 h-[24px] w-[24px]">
						<Image src="/icons/github-logo.svg" width={24} height={24} alt="GitHub Logo" />
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

export function Cta() {
	const t = useTranslations('contentElements.feedbackCta');

	return (
		<div className="max-w-5xl mx-2 md:mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc]">
			<div className="flex flex-col items-center justify-center text-center py-12 px-5 xs:px-10 md:py-16 rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6]">
				<h2 className="text-2xl md:text-4xl font-medium mt-3 leading-[1.2] text-slate-800">
					{t('headline')} <br />
				</h2>

				<p className="text-slate-600 mt-3 md:text-lg">
					{t('subHeadline1')}
					<br />
					{t('subHeadline2')}
				</p>

				<div className="mt-8 flex flex-wrap justify-center space-x-2 sm:space-x-4">
					<Link
						href="https://github.com/FloB95/qrcodly"
						target="_blank"
						className={buttonVariants()}
					>
						<span className="mr-2 h-[24px] w-[24px]">
							<Image src="/icons/github-logo.svg" width={24} height={24} alt="GitHub Logo" />
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
		</div>
	);
}
