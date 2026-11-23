'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { NoSymbolIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
	MAX_SCAN_IP_EXCLUSIONS,
	SCAN_IP_EXCLUSION_LABEL_MAX_LENGTH,
	ScanIpRangeSchema,
	type TScanIpExclusionResponseDto,
} from '@shared/schemas';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from '@/components/ui/item';
import { toast } from '@/components/ui/use-toast';
import { ProPlanRequiredBadge } from '@/components/ProPlanRequiredBadge';
import { useHasProPlan } from '@/hooks/useHasProPlan';
import type { ApiError } from '@/lib/api/ApiError';
import { ipv6Network64 } from '@/lib/ip-network';
import {
	useCreateScanIpExclusionMutation,
	useCurrentClientIpQuery,
	useDeleteScanIpExclusionMutation,
	useListScanIpExclusionsQuery,
} from '@/lib/api/scan-ip-exclusion';

const HINTS = ['hintNetworkOnly', 'hintIpv6', 'hintFutureOnly', 'hintPrivacy'] as const;

export function ScanIpExclusionsCard() {
	const t = useTranslations('settings.analytics');
	const locale = useLocale();
	const { hasProPlan, isLoading: isPlanLoading } = useHasProPlan();

	const { data: entries, isPending, isError } = useListScanIpExclusionsQuery();
	const { data: currentIp } = useCurrentClientIpQuery(hasProPlan);
	const createMutation = useCreateScanIpExclusionMutation();
	const deleteMutation = useDeleteScanIpExclusionMutation();

	const [ipRange, setIpRange] = useState('');
	const [label, setLabel] = useState('');
	const [ipError, setIpError] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TScanIpExclusionResponseDto | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const count = entries?.length ?? 0;
	const atLimit = count >= MAX_SCAN_IP_EXCLUSIONS;
	const currentNetwork = currentIp?.ip ? ipv6Network64(currentIp.ip) : null;

	const captureError = (e: unknown, event: string) => {
		const error = e as ApiError;
		if (error.code === 0 || error.code >= 500) {
			Sentry.captureException(error);
		}
		posthog.capture(event, { error: { code: error.code, message: error.message } });
		return error;
	};

	const createErrorDescription = (error: ApiError) => {
		if (error.code === 409) return t('errorDuplicate');
		// Plan limits come without an errorCode; other 403s (e.g. account pending deletion) have one
		if (error.code === 403 && !error.errorCode) {
			return t('errorLimit', { max: MAX_SCAN_IP_EXCLUSIONS });
		}
		if (error.code === 400) return t('invalidIp');
		return t('errorGeneric');
	};

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		const parsed = ScanIpRangeSchema.safeParse(ipRange);
		if (!parsed.success) {
			setIpError(t('invalidIp'));
			return;
		}

		try {
			const created = await createMutation.mutateAsync({
				ipRange: parsed.data,
				label: label.trim() || undefined,
			});
			posthog.capture('scan-ip-exclusion:created');
			toast({
				title: t('addedToast'),
				description:
					created.ipRange === parsed.data
						? t('addedToastDescription', { ipRange: created.ipRange })
						: t('addedToastSavedAs', { ipRange: created.ipRange }),
			});
			setIpRange('');
			setLabel('');
		} catch (e: unknown) {
			const error = captureError(e, 'error:scan-ip-exclusion-create');
			toast({
				title: t('addErrorTitle'),
				description: createErrorDescription(error),
				variant: 'destructive',
			});
		}
	};

	const handleDelete = async (entry: TScanIpExclusionResponseDto) => {
		try {
			await deleteMutation.mutateAsync(entry.id);
			posthog.capture('scan-ip-exclusion:deleted');
			toast({
				title: t('deletedToast'),
				description: t('deletedToastDescription', { ipRange: entry.ipRange }),
			});
		} catch (e: unknown) {
			captureError(e, 'error:scan-ip-exclusion-delete');
			toast({ title: t('deleteError'), variant: 'destructive' });
		}
	};

	const renderAddArea = () => {
		if (isPlanLoading) {
			return <Skeleton className="h-32 w-full" />;
		}

		if (!hasProPlan) {
			return (
				<div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						{count > 0 && <p className="text-sm font-medium">{t('inactiveWithoutPro')}</p>}
						<p className="text-sm text-muted-foreground">
							{t('proUpsell', { max: MAX_SCAN_IP_EXCLUSIONS })}
						</p>
					</div>
					<div className="shrink-0">
						<ProPlanRequiredBadge source="scan_ip_exclusions" />
					</div>
				</div>
			);
		}

		return (
			<form onSubmit={handleAdd} className="space-y-3" noValidate>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="scan-ip-range">{t('ipLabel')}</Label>
						<Input
							id="scan-ip-range"
							value={ipRange}
							onChange={(e) => {
								setIpRange(e.target.value);
								setIpError(null);
							}}
							placeholder="203.0.113.0/24"
							className="font-mono"
							autoComplete="off"
							spellCheck={false}
							aria-invalid={!!ipError}
							aria-describedby={ipError ? 'scan-ip-range-error' : undefined}
						/>
						{ipError && (
							<p id="scan-ip-range-error" className="text-sm text-destructive">
								{ipError}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="scan-ip-label">
							{t('labelLabel')}{' '}
							<span className="font-normal text-muted-foreground">({t('optional')})</span>
						</Label>
						<Input
							id="scan-ip-label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder={t('labelPlaceholder')}
							maxLength={SCAN_IP_EXCLUSION_LABEL_MAX_LENGTH}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					{currentIp?.ip && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-auto min-h-9 whitespace-normal py-2 [overflow-wrap:anywhere]"
							onClick={() => {
								setIpRange(currentNetwork ?? currentIp.ip ?? '');
								setIpError(null);
							}}
						>
							{currentNetwork
								? t('useCurrentNetwork', { range: currentNetwork })
								: t('useCurrentIp', { ip: currentIp.ip })}
						</Button>
					)}
					<Button
						type="submit"
						className="sm:ml-auto"
						isLoading={createMutation.isPending}
						disabled={atLimit || createMutation.isPending}
					>
						{t('add')}
					</Button>
				</div>
				{atLimit && (
					<p className="text-sm text-muted-foreground">
						{t('limitReached', { max: MAX_SCAN_IP_EXCLUSIONS })}
					</p>
				)}
			</form>
		);
	};

	const renderList = () => {
		if (isPending) {
			return (
				<div className="space-y-2">
					<Skeleton className="h-14 w-full" />
					<Skeleton className="h-14 w-full" />
				</div>
			);
		}

		if (isError) {
			return <p className="text-sm text-muted-foreground">{t('loadError')}</p>;
		}

		if (count === 0) {
			return (
				<div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
					<NoSymbolIcon className="size-5 shrink-0 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">{t('emptyTitle')}</p>
						<p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
					</div>
				</div>
			);
		}

		return (
			<ItemGroup className="gap-2">
				{entries.map((entry) => (
					<Item
						key={entry.id}
						role="listitem"
						variant="outline"
						size="sm"
						className="flex-row flex-nowrap items-center"
					>
						<ItemContent className="min-w-0">
							<ItemTitle className="w-auto break-all font-mono">{entry.ipRange}</ItemTitle>
							<ItemDescription className="break-words">
								{entry.label && <>{entry.label} &middot; </>}
								{t('addedOn', {
									date: new Date(entry.createdAt).toLocaleDateString(locale),
								})}
							</ItemDescription>
						</ItemContent>
						<ItemActions>
							<Button
								variant="ghost"
								size="icon"
								className="size-9 text-muted-foreground hover:text-destructive"
								onClick={() => {
									setDeleteTarget(entry);
									setDeleteOpen(true);
								}}
								disabled={deleteMutation.isPending}
							>
								<TrashIcon className="size-5" />
								<span className="sr-only">{t('delete')}</span>
							</Button>
						</ItemActions>
					</Item>
				))}
			</ItemGroup>
		);
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>{t('exclusionsTitle')}</CardTitle>
					<CardDescription>{t('exclusionsDescription')}</CardDescription>
					{hasProPlan && !isPending && !isError && (
						<CardAction className="text-sm tabular-nums text-muted-foreground">
							{count} / {MAX_SCAN_IP_EXCLUSIONS}
						</CardAction>
					)}
				</CardHeader>
				<CardContent className="space-y-6">
					{renderAddArea()}
					{renderList()}
					<ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
						{HINTS.map((hint) => (
							<li key={hint}>{t(hint)}</li>
						))}
					</ul>
				</CardContent>
			</Card>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
						<DialogDescription>
							{t('deleteConfirmDescription', { ipRange: deleteTarget?.ipRange ?? '' })}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteOpen(false)}>
							{t('cancel')}
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								setDeleteOpen(false);
								if (deleteTarget) void handleDelete(deleteTarget);
							}}
						>
							{t('delete')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
