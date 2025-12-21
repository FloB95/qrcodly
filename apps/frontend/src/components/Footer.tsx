import Link from 'next/link';
import Container from './ui/container';
import { useTranslations } from 'next-intl';

interface NavigationItem {
	name: string;
	href: string;
	icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const navigation: NavigationItem[] = [
	{
		name: 'GitHub',
		href: 'https://github.com/FloB95/qrcodly',
		icon: (props) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path
					fillRule="evenodd"
					d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
					clipRule="evenodd"
				/>
			</svg>
		),
	},
];

export default function Footer() {
	const t = useTranslations('footer');
	const currentYear = new Date().getFullYear();
	return (
		<footer className="mt-4">
			<Container>
				<div className="mx-auto px-6 pt-12 md:flex md:items-center md:justify-between lg:px-8">
					<div className="flex justify-center space-x-6 md:order-2">
						{navigation.map((item) => (
							<Link
								key={item.name}
								href={item.href}
								className="text-gray-600 hover:text-gray-800"
								target="_blank"
							>
								<span className="sr-only">{item.name}</span>
								<item.icon className="h-6 w-6" aria-hidden="true" />
							</Link>
						))}
					</div>
					<div className="mt-8 md:order-1 md:mt-0">
						<p className="text-center text-xs leading-5 ">
							&copy; FB Dev {currentYear} - {t('qrCodeCopyright')}
						</p>
					</div>
				</div>
				<div className="justify-center space-x-4 pt-6 pb-12 text-center text-xs md:flex md:items-center lg:px-8">
					<Link href="/imprint" title={t('legalNotice')}>
						{t('legalNotice')}
					</Link>
					<Link href="/privacy-policy" title={t('privacyPolicy')}>
						{t('privacyPolicy')}
					</Link>
				</div>
			</Container>
		</footer>
	);
}
