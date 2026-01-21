'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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

	const isMountedRef = useRef(true);
	const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			if (verifyTimeoutRef.current) {
				clearTimeout(verifyTimeoutRef.current);
			}
		};
	}, []);

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
				// Detect phase transition: dns_verification -> cloudflare_ssl
				const phaseTransitioned =
					domain.verificationPhase === 'dns_verification' &&
					data.verificationPhase === 'cloudflare_ssl';

				// Check if now fully verified (SSL active)
				if (data.sslStatus === 'active') {
					toastInstance.dismiss();
					setIsVerifying(false);
					toast({
						title: t('domainVerified'),
						description: t('domainVerifiedDescription', { domain: domain.domain }),
					});
					posthog.capture('custom-domain:verified', { domain: domain.domain });
				} else if (phaseTransitioned) {
					// DNS verification complete, domain registered with Cloudflare
					// Automatically verify again to fetch the SSL validation records from Cloudflare
					toastInstance.update({
						id: toastInstance.id,
						title: t('dnsVerificationComplete'),
						description: t('fetchingSslInstructions'),
					});
					posthog.capture('custom-domain:dns-verified', {
						domain: domain.domain,
						newPhase: data.verificationPhase,
					});

					// Small delay to allow Cloudflare to provision SSL validation records
					verifyTimeoutRef.current = setTimeout(() => {
						if (!isMountedRef.current) return;
						verifyMutation.mutate(data.id, {
							onSuccess: (updatedData) => {
								if (!isMountedRef.current) return;
								toastInstance.dismiss();
								setIsVerifying(false);
								if (updatedData.sslStatus === 'active') {
									toast({
										title: t('domainVerified'),
										description: t('domainVerifiedDescription', { domain: domain.domain }),
									});
								} else {
									toast({
										title: t('sslInstructionsReady'),
										description: t('sslInstructionsReadyDescription'),
										duration: 6000,
									});
								}
							},
							onError: () => {
								if (!isMountedRef.current) return;
								// If second verify fails, still show success for the DNS verification
								toastInstance.dismiss();
								setIsVerifying(false);
								toast({
									title: t('dnsVerificationComplete'),
									description: t('dnsVerificationCompleteDescription'),
									duration: 8000,
								});
							},
						});
					}, 2500);
				} else {
					toastInstance.dismiss();
					setIsVerifying(false);

					// Show specific messages based on verification status
					if (data.verificationPhase === 'dns_verification') {
						// Still in DNS verification phase
						if (data.ownershipTxtVerified && !data.cnameVerified) {
							// TXT verified but CNAME not
							toast({
								title: t('txtVerifiedCnamePending'),
								description: t('txtVerifiedCnamePendingDescription'),
							});
						} else if (!data.ownershipTxtVerified && data.cnameVerified) {
							// CNAME verified but TXT not
							toast({
								title: t('cnameVerifiedTxtPending'),
								description: t('cnameVerifiedTxtPendingDescription'),
							});
						} else if (!data.ownershipTxtVerified && !data.cnameVerified) {
							// Neither verified
							toast({
								title: t('dnsNotVerified'),
								description: t('dnsNotVerifiedDescription'),
							});
						} else {
							// Both verified but still in dns_verification phase (shouldn't happen normally)
							toast({
								title: t('statusUpdated'),
								description: t('statusUpdatedDescription', { status: data.sslStatus }),
							});
						}
					} else {
						// In cloudflare_ssl phase
						toast({
							title: t('statusUpdated'),
							description: t('statusUpdatedDescription', { status: data.sslStatus }),
						});
					}

					posthog.capture('custom-domain:status-checked', {
						domain: domain.domain,
						status: data.sslStatus,
						ownershipTxtVerified: data.ownershipTxtVerified,
						cnameVerified: data.cnameVerified,
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
