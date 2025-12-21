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
import { RectangleStackIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

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
								<div>
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
								</div>
							)}
							<UserButton />
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
						<div className="text-xl font-bold  text-black">
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

					<div className="space-y-2">
						<Link
							href="/plan"
							className={buttonVariants({
								variant: 'ghost',
								className: 'w-full justify-start text-foreground font-semibold',
							})}
						>
							Plan
						</Link>
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
						<SignedIn>
							<Link
								href="/collection"
								className={buttonVariants({
									className: 'ml-3 justify-start text-foreground font-semibold',
								})}
							>
								{t('collectionBtn')}
							</Link>
						</SignedIn>
						{!hideLanguageNav && (
							<div>
								<LanguageNav />
							</div>
						)}
					</div>
				</DrawerContent>
			</Drawer>
		</header>
	);
}
