'use client';

import { useListCustomDomainsQuery } from '@/lib/api/custom-domain';
import { useTranslations } from 'next-intl';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { FormControl, FormDescription, FormItem, FormLabel } from '@/components/ui/form';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface DomainSelectorProps {
	value: string | null | undefined;
	onChange: (value: string | null) => void;
	disabled?: boolean;
}

export function DomainSelector({ value, onChange, disabled }: DomainSelectorProps) {
	const t = useTranslations('generator.domainSelector');
	const { data, isLoading } = useListCustomDomainsQuery(1, 100);

	// Filter only verified domains (SSL must be active)
	const verifiedDomains = data?.data.filter((d) => d.sslStatus === 'active') ?? [];

	if (isLoading) {
		return (
			<FormItem>
				<FormLabel>{t('label')}</FormLabel>
				<Skeleton className="h-10 w-full" />
			</FormItem>
		);
	}

	// If no verified domains, show a link to settings
	if (verifiedDomains.length === 0) {
		return (
			<FormItem>
				<FormLabel>{t('label')}</FormLabel>
				<FormDescription>
					{t('noDomains')}{' '}
					<Link href="/settings/domains" className="text-primary underline">
						{t('addDomain')}
					</Link>
				</FormDescription>
			</FormItem>
		);
	}

	return (
		<FormItem>
			<FormLabel>{t('label')}</FormLabel>
			<Select
				value={value ?? 'default'}
				onValueChange={(val) => onChange(val === 'default' ? null : val)}
				disabled={disabled}
			>
				<FormControl>
					<SelectTrigger>
						<SelectValue placeholder={t('placeholder')} />
					</SelectTrigger>
				</FormControl>
				<SelectContent>
					<SelectItem value="default">
						<div className="flex items-center gap-2">
							<GlobeAltIcon className="h-4 w-4" />
							<span>{t('defaultDomain')}</span>
						</div>
					</SelectItem>
					{verifiedDomains.map((domain) => (
						<SelectItem key={domain.id} value={domain.id}>
							<div className="flex items-center gap-2">
								<GlobeAltIcon className="h-4 w-4 text-primary" />
								<span>{domain.domain}</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FormDescription>{t('description')}</FormDescription>
		</FormItem>
	);
}
