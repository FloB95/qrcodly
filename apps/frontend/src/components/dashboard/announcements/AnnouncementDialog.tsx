'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/20/solid';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import { Link } from '@/i18n/navigation';
import { useAllCustomDomainsQuery } from '@/lib/api/custom-domain';
import type { Announcement } from './announcements.config';
import { NewBadge } from './NewBadge';

interface AnnouncementDialogProps {
	announcement: Announcement | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/** One new feature, presented: a moving look at it, what it is, and the way to it. */
export function AnnouncementDialog({ announcement, open, onOpenChange }: AnnouncementDialogProps) {
	const t = useTranslations('announcements');
	const format = useFormatter();
	const { hasProPlan } = useHasProPlan();
	const { data: domains } = useAllCustomDomainsQuery();

	if (!announcement) return null;

	const key = `items.${announcement.i18nKey}`;
	const ctx = { hasProPlan, hasCustomDomain: (domains?.length ?? 0) > 0 };
	const cta = announcement.cta(ctx);
	const points = Object.values(t.raw(`${key}.points`) as Record<string, string>);
	const Preview = announcement.preview;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]">
				<div className="relative h-60 overflow-hidden border-b bg-slate-50">
					<Preview />
				</div>

				<div className="p-6 sm:p-8">
					<div className="mb-3 flex items-center gap-2">
						<NewBadge />
						<time dateTime={announcement.date} className="text-xs text-muted-foreground">
							{format.dateTime(new Date(announcement.date), {
								day: 'numeric',
								month: 'long',
								year: 'numeric',
							})}
						</time>
					</div>
					<DialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
						{t(`${key}.title`)}
					</DialogTitle>
					<DialogDescription className="mt-2 max-w-prose text-[15px] leading-relaxed text-slate-600">
						{t(`${key}.description`)}
					</DialogDescription>

					<ul className="mt-5 space-y-2.5">
						{points.map((point) => (
							<li key={point} className="flex gap-2.5 text-sm text-slate-700">
								<CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-teal-600" />
								{point}
							</li>
						))}
					</ul>

					{!announcement.isAvailable(ctx) && (
						<p className="mt-4 text-[13px] text-muted-foreground">{t(`${key}.requirement`)}</p>
					)}

					<div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
						{announcement.faqHref && (
							<Button variant="ghost" asChild>
								<Link href={announcement.faqHref}>{t('faq')}</Link>
							</Button>
						)}
						<Button asChild className="sm:ml-auto">
							<Link
								href={cta.href}
								onClick={() => {
									posthog.capture('announcements:cta-clicked', {
										id: announcement.id,
										target: cta.label,
									});
									onOpenChange(false);
								}}
							>
								{t(`${key}.cta.${cta.label}`)}
							</Link>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
