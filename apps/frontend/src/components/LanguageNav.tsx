'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { GlobeAsiaAustraliaIcon } from '@heroicons/react/24/outline';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const LanguageNav = () => {
	const locale = useLocale();
	const currentPath = usePathname();
	const languageLinks = SUPPORTED_LANGUAGES.map((lang) => {
		return {
			lang,
			path: currentPath.replace(`/${locale}`, ``),
		};
	}).sort((a, b) => a.lang.localeCompare(b.lang));

	return (
		<div className="flex flex-col justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<GlobeAsiaAustraliaIcon className="h-8 w-8 cursor-pointer hover:text-gray-700" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-12 min-w-12" align="end">
					{languageLinks.map((link) => (
						<DropdownMenuItem key={link.lang} className={locale === link.lang ? 'bg-accent' : ''}>
							<Link
								locale={link.lang}
								className={locale === link.lang ? 'font-bold' : ''}
								href={link.path}
							>
								{link.lang.toUpperCase()}
							</Link>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};
