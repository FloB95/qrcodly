'use client';

import { SignedIn, SignedOut, SignInButton, UserAvatar } from '@clerk/nextjs';
import Container from './ui/container';
import { Button, buttonVariants } from './ui/button';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageNav } from './LanguageNav';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import {
	RectangleStackIcon,
	LinkIcon,
	QrCodeIcon,
	ChartBarIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { QrcodlyLogo } from './QrcodlyLogo';

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, x: -20 },
	visible: {
		opacity: 1,
		x: 0,
		transition: {
			duration: 0.3,
		},
	},
};

export default function Header({
	hideDashboardLink = false,
	hideLogo = false,
	hideLanguageNav = false,
}) {
	const t = useTranslations('header');
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [productsOpen, setProductsOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const isFeaturesActive = pathname === '/features';
	const isPlansActive = pathname === '/plans';
	const isProductsActive = pathname.startsWith('/products');

	const openProducts = useCallback(() => {
		if (closeTimeout.current) {
			clearTimeout(closeTimeout.current);
			closeTimeout.current = null;
		}
		setProductsOpen(true);
	}, []);

	const closeProducts = useCallback(() => {
		closeTimeout.current = setTimeout(() => setProductsOpen(false), 200);
	}, []);

	// Close dropdown and mobile drawer on route change
	useEffect(() => {
		setProductsOpen(false);
		setMobileMenuOpen(false);
	}, [pathname]);

	// Close dropdown on click outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setProductsOpen(false);
			}
		}
		if (productsOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
		return undefined;
	}, [productsOpen]);

	const productLinks = [
		{
			href: '/products/url-shortener' as const,
			title: t('urlShortenerLink'),
			description: t('urlShortenerDesc'),
			icon: <LinkIcon className="h-5 w-5" />,
		},
		{
			href: '/products/qr-codes' as const,
			title: t('qrCodesLink'),
			description: t('qrCodesDesc'),
			icon: <QrCodeIcon className="h-5 w-5" />,
		},
		{
			href: '/products/analytics' as const,
			title: t('analyticsLink'),
			description: t('analyticsDesc'),
			icon: <ChartBarIcon className="h-5 w-5" />,
		},
	];

	return (
		<header
			className={cn(
				'sticky top-0 z-[100] transition-all duration-300 -mx-4 px-4 sm:mx-0 sm:px-0',
				scrolled
					? 'bg-white/80 backdrop-blur-lg shadow-sm pt-2 pb-2 sm:pt-5 sm:pb-5'
					: 'pt-6 pb-0 sm:pt-10',
			)}
		>
			<Container disableOverflow>
				<div className="flex justify-between pt-1 sm:px-6 lg:px-8">
					<div className="pt-2 sm:pt-0">
						{!hideLogo && (
							<Link href="/" title="QRcodly">
								<QrcodlyLogo size="lg" />
							</Link>
						)}
					</div>
					<div className="flex space-x-2 xs:space-x-4 sm:space-x-6 items-center">
						{/* Products dropdown */}
						<div
							ref={dropdownRef}
							className="relative hidden lg:block"
							onMouseEnter={openProducts}
							onMouseLeave={closeProducts}
						>
							<button
								className={cn(
									'flex items-center gap-1 h-10 px-2 py-2 cursor-pointer transition-colors',
									(isProductsActive || productsOpen) && 'font-semibold text-black',
								)}
								onClick={openProducts}
							>
								{t('productsBtn')}
								<ChevronDownIcon
									className={cn(
										'h-3.5 w-3.5 transition-transform duration-200',
										productsOpen && 'rotate-180',
									)}
								/>
							</button>

							<AnimatePresence>
								{productsOpen && (
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 8 }}
										transition={{ duration: 0.15 }}
										className="absolute top-full left-1/2 -translate-x-1/2 z-50"
									>
										{/* Invisible bridge to prevent gap hover loss */}
										<div className="h-2" />
										<div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 p-2 w-[340px]">
											<div className="space-y-0.5">
												{productLinks.map((link) => {
													const isActive = pathname.startsWith(link.href);
													return (
														<Link
															key={link.href}
															href={link.href}
															className={cn(
																'flex items-center gap-3.5 rounded-xl p-3 hover:bg-slate-100 transition-colors group',
																isActive && 'bg-slate-100',
															)}
														>
															<div
																className={cn(
																	'w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-slate-900 group-hover:via-slate-800 group-hover:to-slate-900 group-hover:text-white transition-colors',
																	isActive &&
																		'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white',
																)}
															>
																{link.icon}
															</div>
															<div>
																<div className="text-sm font-semibold text-slate-900">
																	{link.title}
																</div>
																<div className="text-xs text-slate-500 leading-snug">
																	{link.description}
																</div>
															</div>
														</Link>
													);
												})}
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<Link
							href="/features"
							className={cn(
								'hidden lg:block h-10 px-2 py-2',
								isFeaturesActive && 'font-semibold text-black',
							)}
						>
							{t('featuresBtn')}
						</Link>
						<Link
							href="/plans"
							className={cn(
								'hidden lg:block h-10 px-2 py-2',
								isPlansActive && 'font-semibold text-black',
							)}
						>
							{t('plansBtn')}
						</Link>
						<SignedOut>
							<SignInButton>
								<Button>{t('signInBtn')}</Button>
							</SignInButton>
						</SignedOut>
						<SignedIn>
							{!hideDashboardLink && (
								<div className="flex items-center gap-2">
									<Link
										href="/dashboard/qr-codes"
										aria-label={t('collectionBtn')}
										className={cn(
											buttonVariants({ size: 'icon' }),
											'hidden sm:inline-flex lg:hidden',
										)}
									>
										<RectangleStackIcon className="h-6 w-6 text-white" />
									</Link>
									<Link
										href="/dashboard/qr-codes"
										className={cn(buttonVariants(), 'hidden lg:inline-flex')}
									>
										{t('collectionBtn')}
									</Link>
								</div>
							)}
							<Link href="/dashboard/settings/profile">
								<UserAvatar />
							</Link>
						</SignedIn>
						{!hideLanguageNav && (
							<div className="hidden lg:block">
								<LanguageNav />
							</div>
						)}
						{/* Mobile menu button */}
						<div
							className="flex items-center justify-center lg:hidden xs:p-2 cursor-pointer"
							onClick={() => setMobileMenuOpen(true)}
						>
							<Bars3Icon className="h-8 w-8 text-black" />
						</div>
					</div>
				</div>
			</Container>

			<Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="right">
				<DrawerContent className="pt-20 pb-8 px-1 overflow-y-auto">
					<DrawerHeader className="hidden">
						<DrawerTitle>Navigation</DrawerTitle>
					</DrawerHeader>
					<div className="absolute top-6 left-8 right-4 flex items-center justify-between">
						<div className="text-black">
							<Link title="QRcodly" href="/">
								<QrcodlyLogo size="default" />
							</Link>
						</div>
						<DrawerClose asChild>
							<Button size="icon" variant={'ghost'}>
								<XMarkIcon className="h-6 w-6" />
							</Button>
						</DrawerClose>
					</div>

					<motion.div
						className="space-y-2 flex-1 px-3"
						variants={containerVariants}
						initial="hidden"
						animate={mobileMenuOpen ? 'visible' : 'hidden'}
					>
						<motion.div variants={itemVariants}>
							<div className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-900 uppercase tracking-wider">
								{t('productsBtn')}
							</div>
						</motion.div>
						{productLinks.map((link) => (
							<motion.div key={link.href} variants={itemVariants}>
								<Link
									href={link.href}
									className={buttonVariants({
										variant: 'ghost',
										className: cn(
											'w-full justify-start text-foreground font-semibold',
											pathname === link.href && 'bg-accent',
										),
									})}
								>
									<span className="mr-2 text-slate-400">{link.icon}</span>
									{link.title}
								</Link>
							</motion.div>
						))}
						<motion.div variants={itemVariants}>
							<Link
								href="/features"
								className={buttonVariants({
									variant: 'ghost',
									className: cn(
										'w-full justify-start text-foreground font-semibold',
										isFeaturesActive && 'bg-accent',
									),
								})}
							>
								{t('featuresBtn')}
							</Link>
						</motion.div>
						<motion.div variants={itemVariants}>
							<Link
								href="/plans"
								className={buttonVariants({
									variant: 'ghost',
									className: cn(
										'w-full justify-start text-foreground font-semibold',
										isPlansActive && 'bg-accent',
									),
								})}
							>
								{t('plansBtn')}
							</Link>
						</motion.div>
						<SignedIn>
							<motion.div variants={itemVariants}>
								<Link
									href="/dashboard/qr-codes"
									className={buttonVariants({
										className: 'justify-start text-foreground font-semibold',
									})}
								>
									{t('collectionBtn')}
								</Link>
							</motion.div>
						</SignedIn>
						{!hideLanguageNav && (
							<motion.div variants={itemVariants}>
								<div className="border-t border-slate-100 mt-2 pt-4">
									<LanguageNav variant="dropdown-up" />
								</div>
							</motion.div>
						)}
					</motion.div>
				</DrawerContent>
			</Drawer>
		</header>
	);
}
