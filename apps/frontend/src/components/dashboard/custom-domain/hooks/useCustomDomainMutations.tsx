'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from '@/components/ui/use-toast';
import {
	useDeleteCustomDomainMutation,
	useVerifyCustomDomainMutation,
	useSetDefaultCustomDomainMutation,
} from '@/lib/api/custom-domain';
import type { TCustomDomainResponseDto } from '@shared/schemas';
import { Loader2 } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

export const useCustomDomainMutations = (domain: TCustomDomainResponseDto) => {
	const t = useTranslations('settings.domains');
	const [isDeleting, setIsDeleting] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isSettingDefault, setIsSettingDefault] = useState(false);

	const deleteMutation = useDeleteCustomDomainMutation();
	const verifyMutation = useVerifyCustomDomainMutation();
	const setDefaultMutation = useSetDefaultCustomDomainMutation();

	const handleDelete = useCallback(() => {
		setIsDeleting(true);
		const toastInstance = toast({
			title: t('deleting'),
			description: (
				<div className="flex items-center space-x-2">
					<Loader2 className="h-4 w-4 animate-spin" />
				</div>
			),
		});

		deleteMutation.mutate(domain.id, {
			onSuccess: () => {
				toastInstance.dismiss();
				setIsDeleting(false);
				toast({
					title: t('deleted'),
					description: t('deletedDescription', { domain: domain.domain }),
				});
				posthog.capture('custom-domain:deleted', { domain: domain.domain });
			},
			onError: (error) => {
				toastInstance.dismiss();
				setIsDeleting(false);
				toast({
					title: t('deleteError'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
				posthog.capture('error:custom-domain-delete', {
					error: error.message,
					domain: domain.domain,
				});
			},
		});
	}, [domain, deleteMutation, t]);

	const handleVerify = useCallback(() => {
		setIsVerifying(true);
		const toastInstance = toast({
			title: t('checkingStatus'),
			description: (
				<div className="flex items-center space-x-2">
					<Loader2 className="h-4 w-4 animate-spin" />
				</div>
			),
		});

		verifyMutation.mutate(domain.id, {
			onSuccess: (data) => {
				toastInstance.dismiss();
				setIsVerifying(false);
				// Check if now fully verified (SSL active)
				if (data.sslStatus === 'active') {
					toast({
						title: t('domainVerified'),
						description: t('domainVerifiedDescription', { domain: domain.domain }),
					});
					posthog.capture('custom-domain:verified', { domain: domain.domain });
				} else {
					toast({
						title: t('statusUpdated'),
						description: t('statusUpdatedDescription', { status: data.sslStatus }),
					});
					posthog.capture('custom-domain:status-checked', {
						domain: domain.domain,
						status: data.sslStatus,
					});
				}
			},
			onError: (error) => {
				toastInstance.dismiss();
				setIsVerifying(false);
				toast({
					title: t('verifyError'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
				posthog.capture('error:custom-domain-verify', {
					error: error.message,
					domain: domain.domain,
				});
			},
		});
	}, [domain, verifyMutation, t]);

	const handleSetDefault = useCallback(() => {
		setIsSettingDefault(true);
		const toastInstance = toast({
			title: t('settingDefault'),
			description: (
				<div className="flex items-center space-x-2">
					<Loader2 className="h-4 w-4 animate-spin" />
				</div>
			),
		});

		setDefaultMutation.mutate(domain.id, {
			onSuccess: () => {
				toastInstance.dismiss();
				setIsSettingDefault(false);
				toast({
					title: t('defaultSet'),
					description: t('defaultSetDescription', { domain: domain.domain }),
				});
				posthog.capture('custom-domain:set-default', { domain: domain.domain });
			},
			onError: (error) => {
				toastInstance.dismiss();
				setIsSettingDefault(false);
				toast({
					title: t('setDefaultError'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
				posthog.capture('error:custom-domain-set-default', {
					error: error.message,
					domain: domain.domain,
				});
			},
		});
	}, [domain, setDefaultMutation, t]);

	return {
		isDeleting,
		isVerifying,
		isSettingDefault,
		handleDelete,
		handleVerify,
		handleSetDefault,
	};
};
