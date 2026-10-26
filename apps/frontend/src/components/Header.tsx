'use client';

import { Show, SignInButton, UserAvatar } from '@clerk/nextjs';
import Container from './ui/container';
import { Button, buttonVariants } from './ui/button';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageNav } from './LanguageNav';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import {
	RectangleStackIcon,
	LinkIcon,
	QrCodeIcon,
	ChartBarIcon,
	Squares2X2Icon,
	ViewfinderCircleIcon,
	BookOpenIcon,
	QuestionMarkCircleIcon,
	BuildingStorefrontIcon,
	ShoppingBagIcon,
	TicketIcon,
	HomeModernIcon,
	AcademicCapIcon,
	MegaphoneIcon,
	ChatBubbleBottomCenterTextIcon,
	CurrencyDollarIcon,
	ShoppingCartIcon,
	CodeBracketIcon,
	BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import {
	QR_CODE_USE_CASES,
	URL_SHORTENER_USE_CASES,
	type UseCaseDef,
	type UseCaseIconName,
} from '@/lib/use-case-pages';
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

/** Short nav labels per use case slug; the pages themselves keep their own namespaces. */
const SOLUTION_LABEL_KEYS: Record<string, string> = {
	restaurants: 'solRestaurants',
	retail: 'solRetail',
	events: 'solEvents',
	'real-estate': 'solRealEstate',
	education: 'solEducation',
	marketing: 'solMarketing',
	'marketing-teams': 'solMarketingTeams',
	'social-media': 'solSocialMedia',
	sales: 'solSales',
	'e-commerce': 'solEcommerce',
	developers: 'solDevelopers',
	agencies: 'solAgencies',
};

const USE_CASE_ICONS: Record<UseCaseIconName, React.ComponentType<{ className?: string }>> = {
	BuildingStorefrontIcon,
	ShoppingBagIcon,
	TicketIcon,
	HomeModernIcon,
	AcademicCapIcon,
	MegaphoneIcon,
	ChatBubbleBottomCenterTextIcon,
	CurrencyDollarIcon,
	ShoppingCartIcon,
	CodeBracketIcon,
	BuildingOffice2Icon,
};

type MenuLink = {
	href: string;
	title: string;
	description?: string;
	icon?: ReactNode;
	external?: boolean;
};

type MenuGroup = { label?: string; links: MenuLink[] };

type NavMenu = {
	id: 'products' | 'solutions' | 'resources';
	label: string;
	active: boolean;
	groups: MenuGroup[];
	/** Groups side by side instead of stacked. */
	columns?: boolean;
};

export default function Header({
	hideDashboardLink = false,
	hideLogo = false,
	hideLanguageNav = false,
}) {
	const t = useTranslations('header');
	const locale = useLocale();
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [openMenu, setOpenMenu] = useState<NavMenu['id'] | null>(null);
	const [scrolled, setScrolled] = useState(false);
	const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const navRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const cancelClose = useCallback(() => {
		if (closeTimeout.current) {
			clearTimeout(closeTimeout.current);
			closeTimeout.current = null;
		}
	}, []);

	const open = useCallback(
		(id: NavMenu['id']) => {
			cancelClose();
			setOpenMenu(id);
		},
		[cancelClose],
	);

	const scheduleClose = useCallback(() => {
		cancelClose();
		closeTimeout.current = setTimeout(() => setOpenMenu(null), 200);
	}, [cancelClose]);

	// Close dropdown and mobile drawer on route change
	useEffect(() => {
		setOpenMenu(null);
		setMobileMenuOpen(false);
	}, [pathname]);

	// Close dropdown on click outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (navRef.current && !navRef.current.contains(event.target as Node)) {
				setOpenMenu(null);
			}
		}
		if (openMenu) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
		return undefined;
	}, [openMenu]);

	const productLinks: MenuLink[] = [
		{
			href: '/products/qr-codes',
			title: t('qrCodesLink'),
			description: t('qrCodesDesc'),
			icon: <QrCodeIcon className="h-5 w-5" />,
		},
		{
			href: '/products/url-shortener',
			title: t('urlShortenerLink'),
			description: t('urlShortenerDesc'),
			icon: <LinkIcon className="h-5 w-5" />,
		},
		{
			href: '/products/analytics',
			title: t('analyticsLink'),
			description: t('analyticsDesc'),
			icon: <ChartBarIcon className="h-5 w-5" />,
		},
		{
			href: '/features',
			title: t('allFeaturesLink'),
			description: t('allFeaturesDesc'),
			icon: <Squares2X2Icon className="h-5 w-5" />,
		},
	];

	const toSolutionLink = (useCase: UseCaseDef): MenuLink => {
		const key = SOLUTION_LABEL_KEYS[useCase.slug] ?? 'solMarketing';
		const Icon = USE_CASE_ICONS[useCase.iconName];
		return {
			href: `${useCase.parentPath}/${useCase.slug}`,
			title: t(key),
			description: t(`${key}Desc`),
			icon: <Icon className="h-5 w-5" />,
		};
	};
	const industryLinks = QR_CODE_USE_CASES.map(toSolutionLink);
	const teamLinks = URL_SHORTENER_USE_CASES.map(toSolutionLink);

	const resourceLinks: MenuLink[] = [
		{
			href: '/tools/qr-code-scanner',
			title: t('scannerLink'),
			description: t('scannerDesc'),
			icon: <ViewfinderCircleIcon className="h-5 w-5" />,
		},
		{
			href: '/docs',
			title: t('docsLink'),
			description: t('docsDesc'),
			icon: <BookOpenIcon className="h-5 w-5" />,
			external: true,
		},
		{
			href: '/faq',
			title: t('faqLink'),
			description: t('faqDesc'),
			icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
		},
	];

	const isCurrent = (link: MenuLink) => pathname === link.href;
	const isWithin = (link: MenuLink) =>
		pathname === link.href || pathname.startsWith(`${link.href}/`);
	const solutionsActive = [...industryLinks, ...teamLinks].some(isCurrent);
	const isPlansActive = pathname === '/plans';

	const menus: NavMenu[] = [
		{
			id: 'products',
			label: t('productsBtn'),
			active: !solutionsActive && productLinks.some(isWithin),
			groups: [{ links: productLinks }],
		},
		{
			id: 'solutions',
			label: t('solutionsBtn'),
			active: solutionsActive,
			groups: [
				{ label: t('byIndustryLabel'), links: industryLinks },
				{ label: t('byTeamLabel'), links: teamLinks },
			],
			columns: true,
		},
		{
			id: 'resources',
			label: t('resourcesBtn'),
			active: pathname.startsWith('/tools') || pathname === '/faq',
			groups: [{ links: resourceLinks }],
		},
	];

	const linkTarget = (link: MenuLink) =>
		link.external ? { target: '_blank' as const, locale: 'en' as const } : {};

	const renderMenuLink = (link: MenuLink) => {
		const active = isCurrent(link);
		if (!link.icon) {
			return (
				<Link
					key={link.href}
					href={link.href}
					{...linkTarget(link)}
					className={cn(
						'block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors',
						active && 'bg-slate-100 text-slate-900',
					)}
				>
					{link.title}
				</Link>
			);
		}
		return (
			<Link
				key={link.href}
				href={link.href}
				{...linkTarget(link)}
				className={cn(
					'flex items-center gap-3.5 rounded-xl p-3 hover:bg-slate-100 transition-colors group',
					active && 'bg-slate-100',
				)}
			>
				<div
					className={cn(
						'w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-slate-900 group-hover:via-slate-800 group-hover:to-slate-900 group-hover:text-white transition-colors',
						active && 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white',
					)}
				>
					{link.icon}
				</div>
				<div>
					<div className="text-sm font-semibold text-slate-900">{link.title}</div>
					<div className="text-xs text-slate-500 leading-snug">{link.description}</div>
				</div>
			</Link>
		);
	};

	const renderGroup = (group: MenuGroup) => (
		<div key={group.label ?? 'default'}>
			{group.label && (
				<div className="px-3 pt-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
					{group.label}
				</div>
			)}
			<div className="space-y-0.5">{group.links.map(renderMenuLink)}</div>
		</div>
	);

	const renderAccordionLink = (link: MenuLink) => (
		<Link
			key={link.href}
			href={link.href}
			{...linkTarget(link)}
			className={buttonVariants({
				variant: 'ghost',
				className: cn(
					'w-full justify-start text-foreground font-medium',
					isCurrent(link) && 'bg-accent',
				),
			})}
		>
			{link.icon && <span className="mr-2.5 text-slate-400">{link.icon}</span>}
			{link.title}
		</Link>
	);

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
				<div className="flex justify-between gap-6 lg:gap-10 pt-1 sm:px-6 lg:px-8">
					<div className="pt-2 sm:pt-0 flex-shrink-0">
						{!hideLogo && (
							<Link href="/" title="QRcodly">
								<QrcodlyLogo size="lg" />
							</Link>
						)}
					</div>
					<div className="flex space-x-2 xs:space-x-4 sm:space-x-6 items-center">
						<nav ref={navRef} className="hidden lg:flex items-center gap-1">
							{menus.map((menu) => {
								const isOpen = openMenu === menu.id;
								return (
									<div
										key={menu.id}
										className="relative"
										onMouseEnter={() => open(menu.id)}
										onMouseLeave={scheduleClose}
									>
										<button
											type="button"
											aria-expanded={isOpen}
											className={cn(
												'flex items-center gap-1 h-10 px-2 py-2 cursor-pointer transition-colors',
												(menu.active || isOpen) && 'font-semibold text-black',
											)}
											onClick={() => (isOpen ? setOpenMenu(null) : open(menu.id))}
										>
											{menu.label}
											<ChevronDownIcon
												className={cn(
													'h-3.5 w-3.5 transition-transform duration-200',
													isOpen && 'rotate-180',
												)}
											/>
										</button>

										<AnimatePresence>
											{isOpen && (
												<motion.div
													initial={{ opacity: 0, y: 8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: 8 }}
													transition={{ duration: 0.15 }}
													className="absolute top-full left-1/2 -translate-x-1/2 z-50"
												>
													{/* Invisible bridge to prevent gap hover loss */}
													<div className="h-2" />
													<div
														className={cn(
															'bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 p-2',
															menu.columns ? 'w-[700px] grid grid-cols-2 gap-x-4 p-3' : 'w-[340px]',
														)}
													>
														{menu.groups.map(renderGroup)}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								);
							})}
							<Link
								href="/plans"
								className={cn('h-10 px-2 py-2', isPlansActive && 'font-semibold text-black')}
							>
								{t('plansBtn')}
							</Link>
						</nav>
						<Show when="signed-out">
							<SignInButton signUpForceRedirectUrl={`/${locale}/signup-success`}>
								<Button>{t('signInBtn')}</Button>
							</SignInButton>
						</Show>
						<Show when="signed-in">
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
						</Show>
						{!hideLanguageNav && (
							<div className="hidden lg:block">
								<LanguageNav />
							</div>
						)}
						{/* Mobile menu button */}
						<button
							type="button"
							aria-label="Menu"
							className="flex items-center justify-center lg:hidden xs:p-2 cursor-pointer"
							onClick={() => setMobileMenuOpen(true)}
						>
							<Bars3Icon className="h-8 w-8 text-black" />
						</button>
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
						className="space-y-1 flex-1 px-3"
						variants={containerVariants}
						initial="hidden"
						animate={mobileMenuOpen ? 'visible' : 'hidden'}
					>
						<motion.div variants={itemVariants}>
							<Accordion
								type="single"
								collapsible
								defaultValue={menus.find((menu) => menu.active)?.id}
								className="mb-2"
							>
								{menus.map((menu) => (
									<AccordionItem
										key={menu.id}
										value={menu.id}
										className="border-b border-slate-100"
									>
										<AccordionTrigger
											className={cn(
												'px-4 py-3.5 text-base font-medium text-slate-700 hover:no-underline',
												menu.active && 'font-semibold text-slate-900',
											)}
										>
											{menu.label}
										</AccordionTrigger>
										<AccordionContent className="pb-2">
											{menu.groups.map((group) => (
												<div key={group.label ?? 'default'} className="space-y-0.5">
													{group.label && (
														<div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
															{group.label}
														</div>
													)}
													{group.links.map(renderAccordionLink)}
												</div>
											))}
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
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
						<Show when="signed-in">
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
						</Show>
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
