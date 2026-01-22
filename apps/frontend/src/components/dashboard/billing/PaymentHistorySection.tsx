'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty';
import { usePaymentAttempts } from '@clerk/nextjs/experimental';
import type { Payment } from './types';
import { BillingSkeleton } from './BillingSkeleton';
import { formatDate, formatCurrency } from '@/lib/utils';

function InvoiceStatusBadge({ status }: { status: Payment['status'] }) {
	const t = useTranslations('settings.billing');

	const variants: Record<Payment['status'], 'green' | 'secondary' | 'destructive'> = {
		paid: 'green',
		pending: 'secondary',
		failed: 'destructive',
	};

	return <Badge variant={variants[status]}>{t(`invoiceStatus.${status}`)}</Badge>;
}

export function PaymentHistorySection() {
	const t = useTranslations('settings.billing');
	const payments = usePaymentAttempts({ pageSize: 100 });

	if (payments.isLoading || payments.isFetching) {
		return <BillingSkeleton titleWidth="w-40" />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<DocumentTextIcon className="size-5" />
					{t('paymentHistory')}
				</CardTitle>
				<CardDescription>{t('paymentHistoryDescription')}</CardDescription>
			</CardHeader>
			<CardContent>
				{!payments.data || payments.data.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<DocumentTextIcon className="h-12 w-12 text-muted-foreground" />
							</EmptyMedia>
							<EmptyTitle>{t('noInvoices')}</EmptyTitle>
							<EmptyDescription>{t('noInvoicesDescription')}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="overflow-hidden rounded-lg border">
						<Table>
							<TableHeader className="bg-muted">
								<TableRow>
									<TableHead>{t('invoiceDate')}</TableHead>
									<TableHead>{t('invoiceDescription')}</TableHead>
									<TableHead>{t('invoiceAmount')}</TableHead>
									<TableHead>{t('invoiceCard')}</TableHead>
									<TableHead>{t('invoiceStatusLabel')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{payments.data.map((payment) => (
									<TableRow key={payment.id}>
										<TableCell className="font-medium">
											{payment.paidAt
												? formatDate(payment.paidAt)
												: payment.failedAt
													? formatDate(payment.failedAt)
													: ''}
										</TableCell>
										<TableCell>
											{payment.subscriptionItem.plan.name} {t('tabPlan')}
										</TableCell>
										<TableCell>
											{formatCurrency(payment.amount.amount, payment.amount.currency)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="text-muted-foreground">
													•••• {payment.paymentMethod?.last4}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<InvoiceStatusBadge status={payment.status} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
