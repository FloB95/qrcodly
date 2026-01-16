'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Container from './ui/container';
import { Button, buttonVariants } from './ui/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageNav } from './LanguageNav';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { RectangleStackIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="pt-10">
			<Container>
				<div className="flex justify-between pt-1 sm:px-6 lg:px-8">
					<div className="text-2xl pt-2 sm:pt-0 sm:text-3xl font-bold">
						{!hideLogo && (
							<Link href="/" title="QRcodly">
								QRcodly
							</Link>
						)}
					</div>
					<div className="flex space-x-4 sm:space-x-6 items-center">
						<Link
							href="/docs"
							target="blank"
							locale={'en'}
							className="hidden sm:block h-10 px-2 py-2"
						>
							Docs
						</Link>
						{/* <Link href="/plans" className="hidden sm:block h-10 px-2 py-2">
							Plans
						</Link> */}
						<SignedOut>
							<SignInButton>
								<Button>{t('signInBtn')}</Button>
							</SignInButton>
						</SignedOut>
						<SignedIn>
							{!hideDashboardLink && (
								<div className="flex items-center gap-2">
									<Link
										href="/collection"
										className={cn(buttonVariants({ size: 'icon' }), 'sm:hidden')}
									>
										<RectangleStackIcon className="h-6 w-6 text-white" />
									</Link>
									<Link
										href="/collection"
										className={cn(buttonVariants(), 'hidden sm:inline-flex')}
									>
										{t('collectionBtn')}
									</Link>
									<Link
										href="/settings/domains"
										className={cn(
											buttonVariants({ variant: 'ghost', size: 'icon' }),
											'hidden sm:inline-flex',
										)}
										title={t('settingsBtn')}
									>
										<Cog6ToothIcon className="h-5 w-5" />
									</Link>
								</div>
							)}
							<UserButton
							// userProfileProps={{
							// 	apiKeysProps: { hide: true },
							// }}
							/>
						</SignedIn>
						{!hideLanguageNav && (
							<div className="hidden sm:block">
								<LanguageNav />
							</div>
						)}
						{/* Mobile menu button */}
						<div
							className="flex items-center justify-center sm:hidden p-2 cursor-pointer"
							onClick={() => setMobileMenuOpen(true)}
						>
							<Bars3Icon className="h-8 w-8 text-black" />
						</div>
					</div>
				</div>
			</Container>

			<Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="right">
				<DrawerContent className="py-28 px-1">
					<DrawerHeader className="hidden">
						<DrawerTitle>Navigation</DrawerTitle>
					</DrawerHeader>
					<div className="absolute top-8 left-4 right-4 flex items-center justify-between">
						<div className="text-xl font-semibold  text-black">
							<Link title="QRcodly" href="/de">
								QRcodly
							</Link>
						</div>
						<DrawerClose asChild>
							<Button size="icon" variant={'ghost'}>
								<XMarkIcon className="h-6 w-6" />
							</Button>
						</DrawerClose>
					</div>

					<motion.div
						className="space-y-2"
						variants={containerVariants}
						initial="hidden"
						animate={mobileMenuOpen ? 'visible' : 'hidden'}
					>
						{/* <motion.div variants={itemVariants}>
							<Link
								href="/plan"
								className={buttonVariants({
									variant: 'ghost',
									className: 'w-full justify-start text-foreground font-semibold',
								})}
							>
								Plan
							</Link>
						</motion.div> */}
						<motion.div variants={itemVariants}>
							<Link
								href="/docs"
								target="blank"
								locale={'en'}
								className={buttonVariants({
									variant: 'ghost',
									className: 'w-full justify-start text-foreground font-semibold',
								})}
							>
								Docs
							</Link>
						</motion.div>
						<SignedIn>
							<motion.div variants={itemVariants}>
								<Link
									href="/collection"
									className={buttonVariants({
										className: 'ml-3 justify-start text-foreground font-semibold',
									})}
								>
									{t('collectionBtn')}
								</Link>
							</motion.div>
							<motion.div variants={itemVariants}>
								<Link
									href="/settings/domains"
									className={buttonVariants({
										variant: 'ghost',
										className: 'w-full justify-start text-foreground font-semibold',
									})}
								>
									<Cog6ToothIcon className="h-5 w-5 mr-2" />
									{t('settingsBtn')}
								</Link>
							</motion.div>
						</SignedIn>
						{!hideLanguageNav && (
							<motion.div variants={itemVariants}>
								<LanguageNav />
							</motion.div>
						)}
					</motion.div>
				</DrawerContent>
			</Drawer>
		</header>
	);
}
