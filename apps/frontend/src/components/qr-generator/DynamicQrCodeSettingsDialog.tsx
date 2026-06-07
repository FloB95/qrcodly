'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSlugSchema } from '@shared/schemas';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCheckSlugAvailabilityQuery } from '@/lib/api/url-shortener';
import { useDefaultCustomDomainQuery, useListCustomDomainsQuery } from '@/lib/api/custom-domain';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getSystemDomain } from '@/lib/utils';

type Props = {
	trigger: ReactNode;
};

const SYSTEM_DOMAIN_VALUE = '__system__';

/**
 * Pro-only popup for tweaking the linked short URL of a dynamic QR before save.
 * - Pick which domain (system qrcodly.de OR a verified custom domain)
 * - Optionally set an "Eigener Pfad" (custom slug; only when a custom domain is selected)
 *
 * The dialog writes to the generator's Zustand store; the actual wiring is done
 * by SaveQrCodeBtn at create-time. Works for ALL dynamic QR types (URL, vCard,
 * event) because all of them share the same shortUrl strategy on the backend.
 */
export function DynamicQrCodeSettingsDialog({ trigger }: Props) {
	const t = useTranslations('shortUrl.create.customSlug');
	const tDomain = useTranslations('generator.domainSelector');
	const tDialog = useTranslations('qrCode.dynamicSettings');
	const tGeneral = useTranslations('general');
	const [open, setOpen] = useState(false);

	const { data: defaultDomain } = useDefaultCustomDomainQuery();
	const { data: domainsData } = useListCustomDomainsQuery(1, 100);
	const verifiedDomains = (domainsData?.data ?? []).filter((d) => d.sslStatus === 'active');

	const { customDomainId, customSlug, updateCustomDomainId, updateCustomSlug } =
		useQrCodeGeneratorStore((state) => state);

	// Selected value in the dialog. `undefined` (in store) means "not yet
	// overridden" → resolve to user's default, with a fallback to system if
	// the user has no default set.
	const initialDomainValue =
		customDomainId === null
			? SYSTEM_DOMAIN_VALUE
			: (customDomainId ?? defaultDomain?.id ?? SYSTEM_DOMAIN_VALUE);

	const [selectedDomain, setSelectedDomain] = useState<string>(initialDomainValue);
	const [slugDraft, setSlugDraft] = useState<string>(customSlug ?? '');

	// Re-sync local form state whenever the dialog opens (in case store changed).
	useEffect(() => {
		if (open) {
			setSelectedDomain(initialDomainValue);
			setSlugDraft(customSlug ?? '');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const isCustomDomainSelected = selectedDomain !== SYSTEM_DOMAIN_VALUE;
	const debouncedSlug = useDebouncedValue(slugDraft.toLowerCase().trim(), 350)[0];
	const formatValid = CustomSlugSchema.safeParse(debouncedSlug).success;

	const slugAvailability = useCheckSlugAvailabilityQuery(
		formatValid ? debouncedSlug : '',
		isCustomDomainSelected ? selectedDomain : null,
	);

	const slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid' = (() => {
		if (!isCustomDomainSelected) return 'idle';
		if (!debouncedSlug) return 'idle';
		if (!formatValid) return 'invalid';
		if (slugAvailability.isFetching) return 'checking';
		if (slugAvailability.data?.available) return 'available';
		if (slugAvailability.data?.reason === 'reserved') return 'reserved';
		if (slugAvailability.data?.reason === 'taken') return 'taken';
		if (slugAvailability.data?.reason === 'invalid') return 'invalid';
		return 'idle';
	})();

	const previewHost = isCustomDomainSelected
		? verifiedDomains.find((d) => d.id === selectedDomain)?.domain
		: getSystemDomain();
	const previewUrl =
		previewHost && slugDraft.trim() ? `https://${previewHost}/u/${slugDraft.trim()}` : null;

	const canSave = !slugDraft.trim() || (isCustomDomainSelected && slugStatus === 'available');

	const handleSave = () => {
		updateCustomDomainId(selectedDomain === SYSTEM_DOMAIN_VALUE ? null : selectedDomain);
		updateCustomSlug(isCustomDomainSelected && slugDraft.trim() ? slugDraft.trim() : undefined);
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{tDialog('title')}</DialogTitle>
					<DialogDescription>{tDialog('description')}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label>{tDomain('label')}</Label>
						<Select value={selectedDomain} onValueChange={setSelectedDomain}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SYSTEM_DOMAIN_VALUE}>
									<div className="flex items-center gap-2">
										<GlobeAltIcon className="h-4 w-4" />
										<span>{getSystemDomain()}</span>
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
					</div>

					<div className="space-y-2">
						<Label>{t('label')}</Label>
						<Input
							placeholder={t('placeholder')}
							disabled={!isCustomDomainSelected}
							value={slugDraft}
							onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
						/>
						<p className="text-xs text-muted-foreground">
							{!isCustomDomainSelected
								? t('requiresDomain')
								: previewUrl
									? `${t('preview')}: ${previewUrl}`
									: t('help')}
						</p>
						{isCustomDomainSelected && slugDraft.trim() && (
							<p
								className={
									slugStatus === 'available'
										? 'text-xs text-emerald-600'
										: slugStatus === 'checking'
											? 'text-xs text-muted-foreground'
											: 'text-xs text-destructive'
								}
							>
								{slugStatus === 'checking' && t('checking')}
								{slugStatus === 'available' && `✓ ${t('available')}`}
								{slugStatus === 'taken' && `✗ ${t('taken')}`}
								{slugStatus === 'reserved' && `✗ ${t('reserved')}`}
								{slugStatus === 'invalid' && `✗ ${t('invalid')}`}
							</p>
						)}
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button variant="outline" onClick={() => setOpen(false)}>
							{tGeneral('cancel')}
						</Button>
						<Button onClick={handleSave} disabled={!canSave}>
							{tGeneral('save')}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
