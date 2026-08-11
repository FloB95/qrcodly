'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { PencilSquareIcon } from '@heroicons/react/24/solid';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
	useAllCustomDomainsQuery,
	useClearDefaultCustomDomainMutation,
	useSetDefaultCustomDomainMutation,
} from '@/lib/api/custom-domain';
import { getSystemDomain } from '@/lib/utils';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

const SYSTEM_DOMAIN_VALUE = 'system';

/**
 * Switches the domain a generated dynamic QR code points at, right where the link is shown.
 *
 * Sending people to the settings page instead used to cost them the code they were building. The
 * choice is the account's default domain, which is what the reserved short URL is minted with —
 * changing it here therefore rebuilds the preview rather than only relabelling it.
 */
export function DefaultDomainPicker() {
	const t = useTranslations('generator.domainSelector');
	const [open, setOpen] = useState(false);

	const { data: domains, isLoading } = useAllCustomDomainsQuery();
	const setDefault = useSetDefaultCustomDomainMutation();
	const clearDefault = useClearDefaultCustomDomainMutation();

	// An unverified domain has no certificate, so a QR code pointing at it would not resolve.
	const usableDomains = (domains ?? []).filter((domain) => domain.sslStatus === 'active');
	const activeDomain = usableDomains.find((domain) => domain.isDefault) ?? null;
	const isPending = setDefault.isPending || clearDefault.isPending;

	const onError = (error: Error) => {
		toast({ title: t('changeError'), description: error.message, variant: 'destructive' });
		posthog.capture('error:custom-domain-set-default', { source: 'generator' });
		Sentry.captureException(error);
	};

	const select = (domainId: string) => {
		if (isPending) return;

		const mutation =
			domainId === SYSTEM_DOMAIN_VALUE
				? clearDefault.mutateAsync()
				: setDefault.mutateAsync(domainId);

		void mutation.then(
			() => {
				setOpen(false);
				// `source` separates this from the settings page, which fires the same event —
				// otherwise there is no way to tell whether the inline picker gets used at all.
				posthog.capture(
					domainId === SYSTEM_DOMAIN_VALUE
						? 'custom-domain:set-system-default'
						: 'custom-domain:set-default',
					{ source: 'generator' },
				);
				toast({ title: t('changed') });
			},
			(error: Error) => onError(error),
		);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button type="button" aria-label={t('label')} className="cursor-pointer">
					<PencilSquareIcon className="size-4 text-black" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-2">
				<p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('label')}</p>

				{isLoading ? (
					<div className="space-y-1 p-1">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : usableDomains.length === 0 ? (
					<p className="px-2 py-1.5 text-sm text-muted-foreground">
						{t('noDomains')}{' '}
						<Link href="/dashboard/settings/domains" className="text-primary underline">
							{t('addDomain')}
						</Link>
					</p>
				) : (
					<ul className="space-y-0.5">
						<DomainOption
							label={getSystemDomain()}
							selected={activeDomain === null}
							disabled={isPending}
							onSelect={() => select(SYSTEM_DOMAIN_VALUE)}
						/>
						{usableDomains.map((domain) => (
							<DomainOption
								key={domain.id}
								label={domain.domain}
								highlighted
								selected={domain.isDefault}
								disabled={isPending}
								onSelect={() => select(domain.id)}
							/>
						))}
					</ul>
				)}
			</PopoverContent>
		</Popover>
	);
}

function DomainOption({
	label,
	selected,
	disabled,
	highlighted,
	onSelect,
}: {
	label: string;
	selected: boolean;
	disabled: boolean;
	highlighted?: boolean;
	onSelect: () => void;
}) {
	return (
		<li>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				aria-current={selected}
				disabled={disabled}
				onClick={onSelect}
				className="h-8 w-full justify-start gap-2 px-2 font-normal"
			>
				<GlobeAltIcon className={highlighted ? 'h-4 w-4 text-primary' : 'h-4 w-4'} />
				<span className="min-w-0 flex-1 truncate text-left">{label}</span>
				{selected && <Check className="h-4 w-4 shrink-0" />}
				{disabled && selected && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
			</Button>
		</li>
	);
}
