'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { SUPPORTED_LANGUAGES } from '@/i18n/routing';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGE_NAMES: Record<string, string> = {
	de: 'Deutsch',
	en: 'English',
	es: 'Español',
	fr: 'Français',
	it: 'Italiano',
	nl: 'Nederlands',
	pl: 'Polski',
	ru: 'Русский',
};

export const LanguageNav = () => {
	const locale = useLocale();
	const currentPath = usePathname();
	const [open, setOpen] = useState(false);
	const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const languageLinks = SUPPORTED_LANGUAGES.map((lang) => ({
		lang,
		path: currentPath.replace(`/${locale}`, ''),
	})).sort((a, b) => a.lang.localeCompare(b.lang));

	const openMenu = useCallback(() => {
		if (closeTimeout.current) {
			clearTimeout(closeTimeout.current);
			closeTimeout.current = null;
		}
		setOpen(true);
	}, []);

	const closeMenu = useCallback(() => {
		closeTimeout.current = setTimeout(() => setOpen(false), 200);
	}, []);

	useEffect(() => {
		setOpen(false);
	}, [currentPath]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
		return undefined;
	}, [open]);

	return (
		<div suppressHydrationWarning>
			{/* Desktop */}
			<div
				ref={containerRef}
				className="relative hidden sm:flex flex-col justify-center"
				onMouseEnter={openMenu}
				onMouseLeave={closeMenu}
			>
				<button
					className={cn(
						'flex items-center gap-1.5 h-10 px-4 py-2 rounded-md cursor-pointer transition-all text-sm font-medium',
						'hover:bg-gradient-to-r hover:from-slate-900 hover:via-slate-800 hover:to-slate-900 hover:text-white',
						open
							? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white'
							: 'text-slate-700',
					)}
					onClick={() => setOpen((prev) => !prev)}
				>
					<GlobeAltIcon className="h-5 w-5" />
					<span className="font-medium">{locale.toUpperCase()}</span>
					<ChevronDownIcon
						className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
					/>
				</button>

				<AnimatePresence>
					{open && (
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 8 }}
							transition={{ duration: 0.15 }}
							className="absolute top-full right-0 z-[200]"
						>
							{/* Invisible bridge */}
							<div className="h-2" />
							<div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 py-1.5 w-[180px]">
								{languageLinks.map((link, idx) => {
									const isActive = locale === link.lang;
									return (
										<React.Fragment key={link.lang}>
											{idx > 0 && <div className="mx-3 border-t border-slate-100" />}
											<Link
												locale={link.lang}
												href={link.path}
												className={cn(
													'flex items-center justify-between px-3 py-2 mx-1.5 rounded-lg text-sm transition-colors hover:bg-slate-100',
													isActive && 'bg-slate-100',
												)}
											>
												<span
													className={cn(
														'text-slate-700',
														isActive && 'font-semibold text-slate-900',
													)}
												>
													{LANGUAGE_NAMES[link.lang] ?? link.lang}
												</span>
												<span
													className={cn(
														'text-xs text-slate-400',
														isActive && 'font-semibold text-slate-600',
													)}
												>
													{link.lang.toUpperCase()}
												</span>
											</Link>
										</React.Fragment>
									);
								})}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Mobile */}
			<div className="w-full justify-start flex flex-row space-x-2 sm:hidden p-4 text-sm mt-10">
				{languageLinks.map((link) => (
					<Link
						key={link.lang}
						locale={link.lang}
						className={locale === link.lang ? 'font-bold' : ''}
						href={link.path}
					>
						{link.lang.toUpperCase()}
					</Link>
				))}
			</div>
		</div>
	);
};
