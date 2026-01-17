'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePaymentElement, PaymentElement, usePaymentMethods } from '@clerk/nextjs/experimental';
import {
	CreditCardIcon,
	PlusIcon,
	EllipsisVerticalIcon,
	TrashIcon,
	StarIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { PaymentMethod } from './types';
import { BillingSkeleton } from './BillingSkeleton';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';

function AddPaymentMethodForm({ revalidate }: { revalidate: () => void }) {
	const t = useTranslations('settings.billing');
	const { user } = useUser();
	const { submit, isFormReady } = usePaymentElement();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAddPaymentMethod = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isFormReady || !user) {
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			const { data, error } = await submit();

			if (error) {
				setError(error.error.message || t('paymentValidationFailed'));
				setIsSubmitting(false);

				Sentry.captureException(error, { data });
				posthog.capture('error:add-payment-method', {
					error,
				});

				return;
			}

			await user.addPaymentMethod(data);
			revalidate();
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : t('unexpectedError');
			Sentry.captureException(err);
			posthog.capture('error:add-payment-method', {
				error: err,
			});
			setError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleAddPaymentMethod} className="space-y-4">
			<div className="min-h-50">
				<PaymentElement />
			</div>
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			<div className="flex justify-end gap-2">
				<Button
					size="sm"
					type="submit"
					disabled={!isFormReady || isSubmitting}
					isLoading={isSubmitting}
				>
					{t('saveCard')}
				</Button>
			</div>
		</form>
	);
}

function PaymentMethodCard({
	method,
	revalidate,
}: {
	method: PaymentMethod;
	revalidate: () => void;
}) {
	const t = useTranslations('settings.billing');
	const [isLoading, setIsLoading] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const handleDelete = async () => {
		setIsLoading(true);
		try {
			await method.remove();
			revalidate();
		} catch (err) {
			Sentry.captureException(err);
			posthog.capture('error:remove-payment-method', { error: err });
		} finally {
			setIsLoading(false);
			setShowDeleteDialog(false);
		}
	};

	const handleMakeDefault = async () => {
		setIsLoading(true);
		try {
			await method.makeDefault();
			revalidate();
		} catch (err) {
			Sentry.captureException(err);
			posthog.capture('error:make-default-payment-method', { error: err });
		} finally {
			setIsLoading(false);
		}
	};

	const getBrandIcon = (_brand: string) => {
		return <CreditCardIcon className="size-8 text-muted-foreground" />;
	};

	return (
		<div className="flex items-center justify-between p-4 border rounded-lg bg-card">
			<div className="flex items-center gap-4">
				{getBrandIcon(method.cardType || '')}
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium capitalize">{method.cardType}</span>
						<span className="text-muted-foreground">•••• {method.last4}</span>
						{method.isDefault && (
							<Badge variant="secondary" className="text-xs">
								{t('default')}
							</Badge>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						{t('expires')} {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
					</p>
				</div>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" disabled={isLoading}>
						<EllipsisVerticalIcon className="size-5" />
						<span className="sr-only">{t('openMenu')}</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{!method.isDefault && (
						<>
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={handleMakeDefault}
								disabled={isLoading}
							>
								<StarIcon className="size-4 mr-2" />
								{t('makeDefault')}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem
						onClick={() => setShowDeleteDialog(true)}
						disabled={isLoading || method.isDefault}
						className="text-destructive focus:text-destructive cursor-pointer"
					>
						<TrashIcon className="size-4 mr-2" />
						{t('remove')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('removeCardTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('removeCardDescription', { last4: method.last4 || '' })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{t('remove')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export function PaymentMethodsSection() {
	const t = useTranslations('settings.billing');
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const { isLoading, isFetching, data, revalidate } = usePaymentMethods();

	const handleRevalidate = useCallback(() => {
		setIsAddDialogOpen(false);
		revalidate();
	}, [revalidate]);

	if (isLoading || isFetching) {
		return <BillingSkeleton titleWidth="w-40" contentHeight="h-24" />;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">{t('paymentMethods')}</CardTitle>
						<CardDescription className="mt-1">{t('paymentMethodsDescription')}</CardDescription>
					</div>
					<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<PlusIcon className="size-4 mr-2" />
								{t('addPaymentMethod')}
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>{t('addPaymentMethodTitle')}</DialogTitle>
								<DialogDescription>{t('addPaymentMethodDescription')}</DialogDescription>
							</DialogHeader>
							<AddPaymentMethodForm revalidate={handleRevalidate} />
						</DialogContent>
					</Dialog>
				</div>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<CreditCardIcon className="h-12 w-12 text-muted-foreground" />
							</EmptyMedia>
							<EmptyTitle>{t('noPaymentMethods')}</EmptyTitle>
							<EmptyDescription>{t('noPaymentMethodsDescription')}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="space-y-3">
						{data.map((method) => (
							<PaymentMethodCard key={method.id} method={method} revalidate={revalidate} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
