'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { QuestionMarkCircleIcon, BookOpenIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

type HelpSupportContentProps = {
	onClose: () => void;
};

const actions = [
	{
		key: 'faq' as const,
		icon: QuestionMarkCircleIcon,
		href: '/faq',
		type: 'link' as const,
	},
	{
		key: 'docs' as const,
		icon: BookOpenIcon,
		href: '/docs',
		type: 'link' as const,
		locale: 'en' as const,
	},
	{
		key: 'email' as const,
		icon: EnvelopeIcon,
		href: 'mailto:support@qrcodly.de',
		type: 'mailto' as const,
	},
];

export function HelpSupportContent({ onClose }: HelpSupportContentProps) {
	const t = useTranslations('helpSupport');

	return (
		<div className="p-2">
			<div className="space-y-0.5">
				{actions.map((action) => {
					const Icon = action.icon;
					const content = (
						<div className="flex items-center gap-3.5 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-muted transition-colors cursor-pointer group">
							<div className="w-10 h-10 bg-slate-100 dark:bg-muted rounded-xl flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-slate-900 group-hover:via-slate-800 group-hover:to-slate-900 group-hover:text-white transition-colors">
								<Icon className="h-5 w-5" />
							</div>
							<div>
								<div className="text-sm font-semibold text-slate-900 dark:text-foreground">
									{t(`${action.key}.title`)}
								</div>
								<div className="text-xs text-slate-500 dark:text-muted-foreground leading-snug">
									{t(`${action.key}.subtitle`)}
								</div>
							</div>
						</div>
					);

					if (action.type === 'mailto') {
						return (
							<a key={action.key} href={action.href} onClick={onClose}>
								{content}
							</a>
						);
					}

					return (
						<Link
							key={action.key}
							href={action.href}
							onClick={onClose}
							{...('locale' in action && { locale: action.locale })}
						>
							{content}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
