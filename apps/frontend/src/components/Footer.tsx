'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LanguageNav } from './LanguageNav';

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
			<path
				fillRule="evenodd"
				d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

export default function Footer() {
	const t = useTranslations('footer');
	const pathname = usePathname();
	const currentYear = new Date().getFullYear();

	return (
		<footer className="-mx-4 sm:mx-0 from-white to-white/60 bg-linear-to-br text-black">
			<div className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-8">
				{/* Main grid */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-gray-300">
					{/* Logo + tagline */}
					<div className="col-span-2 md:col-span-1">
						<div className="text-xl font-bold text-black mb-3">QRcodly</div>
						<p className="text-sm text-gray-600 leading-relaxed">{t('tagline')}</p>
						<a
							href="https://github.com/FloB95/qrcodly"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-block mt-4 text-gray-600 hover:text-gray-900 transition-colors"
						>
							<GitHubIcon className="h-5 w-5" aria-hidden="true" />
							<span className="sr-only">GitHub</span>
						</a>
					</div>

					{/* Product */}
					<div>
						<h3 className="text-sm font-semibold text-black mb-4">{t('product')}</h3>
						<ul className="space-y-3">
							<li>
								<Link
									href="/features"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('features')}
								</Link>
							</li>
							<li>
								<Link
									href="/plans"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('pricing')}
								</Link>
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div>
						<h3 className="text-sm font-semibold text-black mb-4">{t('resources')}</h3>
						<ul className="space-y-3">
							<li>
								<Link
									href="/#faq"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
									onClick={(e) => {
										if (pathname === '/') {
											e.preventDefault();
											document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
										}
									}}
								>
									{t('faqLink')}
								</Link>
							</li>
							<li>
								<Link
									href="/docs"
									locale={'en'}
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('docs')}
								</Link>
							</li>
							<li>
								<a
									href="https://github.com/FloB95/qrcodly"
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('github')}
								</a>
							</li>
						</ul>
					</div>

					{/* Legal */}
					<div>
						<h3 className="text-sm font-semibold text-black mb-4">{t('legal')}</h3>
						<ul className="space-y-3">
							<li>
								<Link
									href="/imprint"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('legalNotice')}
								</Link>
							</li>
							<li>
								<Link
									href="/privacy-policy"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('privacyPolicy')}
								</Link>
							</li>
							<li>
								<a
									href="mailto:info@qrcodly.de"
									className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
								>
									{t('contact')}
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
					<p className="text-xs text-gray-500">
						&copy; FB Dev {currentYear} &mdash; {t('qrCodeCopyright')}
					</p>
					<LanguageNav />
				</div>
			</div>
		</footer>
	);
}
