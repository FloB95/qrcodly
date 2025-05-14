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

export default function Header({ hideDashboardLink = false }) {
	const t = useTranslations('header');
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="pt-10">
			<Container>
				<div className="flex justify-between pt-1 sm:px-6 lg:px-8">
					<div className="text-3xl font-bold">
						<Link href="/" title="QRcodly">
							QRcodly
						</Link>
					</div>
					<div className="flex space-x-4 sm:space-x-6 items-center">
						<Link href="/doc" className="hidden sm:block h-10 px-2 py-2">
							API
						</Link>
						<SignedOut>
							<SignInButton>
								<Button>{t('signInBtn')}</Button>
							</SignInButton>
						</SignedOut>
						<SignedIn>
							{!hideDashboardLink && (
								<div className="hidden sm:block">
									<Link href="/collection" className={buttonVariants()}>
										{t('collectionBtn')}
									</Link>
								</div>
							)}
							<UserButton />
						</SignedIn>
						<div className="hidden sm:block">
							<LanguageNav />
						</div>
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
							href="/doc"
							className={buttonVariants({
								variant: 'ghost',
								className: 'w-full justify-start text-foreground font-semibold',
							})}
						>
							API
						</Link>
						<SignedIn>
							<Link
								href="/collection"
								className={buttonVariants({
									variant: 'ghost',
									className: 'w-full justify-start text-foreground font-semibold',
								})}
							>
								{t('collectionBtn')}
							</Link>
						</SignedIn>
						<div>
							<LanguageNav />
						</div>
					</div>
				</DrawerContent>
			</Drawer>
		</header>
	);
}
