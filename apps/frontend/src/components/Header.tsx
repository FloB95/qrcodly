import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Container from './ui/container';
import { Button, buttonVariants } from './ui/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageNav } from './LanguageNav';

export default function Header({ hideDashboardLink = false }) {
	const t = useTranslations('header');

	return (
		<header className="pt-10">
			<Container>
				<div className="flex justify-between pt-1 sm:px-6 lg:px-8">
					<div className="text-3xl font-bold">
						<Link href="/" title="QRcodly">
							QRcodly
						</Link>
					</div>
					<div className="flex space-x-4 sm:space-x-6">
						<Link href="/doc" className="hidden h-10 px-2 py-2 sm:block">
							API
						</Link>
						<SignedOut>
							<SignInButton>
								<Button>{t('signInBtn')}</Button>
							</SignInButton>
						</SignedOut>
						<SignedIn>
							{!hideDashboardLink && (
								<Link href="/collection" className={buttonVariants()}>
									{t('collectionBtn')}
								</Link>
							)}
							<UserButton />
						</SignedIn>
						<LanguageNav />
					</div>
				</div>
			</Container>
		</header>
	);
}
