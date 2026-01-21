'use client';

import { useState, useCallback } from 'react';
import { useUser, useClerk, useReverification } from '@clerk/nextjs';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';

const CONFIRMATION_TEXT: string = 'DELETE';

const deleteAccountSchema = z.object({
	confirmation: z.string().refine((val) => val === CONFIRMATION_TEXT, {
		message: `Please type "${CONFIRMATION_TEXT}" to confirm`,
	}),
});

type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

export function DeleteAccountSection() {
	const { user } = useUser();
	const { signOut } = useClerk();
	const t = useTranslations('settings.security');
	const [isOpen, setIsOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const form = useForm<DeleteAccountFormValues>({
		resolver: zodResolver(deleteAccountSchema),
		defaultValues: {
			confirmation: '',
		},
	});

	// Wrap the delete function with useReverification
	// This automatically handles the reverification modal when Clerk requires it
	const deleteUserWithReverification = useReverification(
		useCallback(async () => {
			if (!user) return;
			await user.delete();
		}, [user]),
	);

	const onSubmit = async () => {
		if (!user) return;

		setIsDeleting(true);
		try {
			await deleteUserWithReverification();
			await signOut();
			toast.success(t('accountDeleted'));
		} catch {
			toast.error(t('accountDeleteError'));
			setIsDeleting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			form.reset();
		}
	};

	return (
		<Card className="border-destructive/50">
			<CardHeader>
				<div className="flex items-start gap-3">
					<div className="p-2 bg-destructive/10 rounded-lg">
						<TrashIcon className="size-5 text-destructive" />
					</div>
					<div>
						<CardTitle className="text-destructive">{t('deleteAccountTitle')}</CardTitle>
						<CardDescription>{t('deleteAccountDescription')}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
					<ExclamationTriangleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
					<div className="text-sm text-destructive">
						<p className="font-medium mb-1">{t('deleteWarningTitle')}</p>
						<ul className="list-disc list-inside space-y-1 text-destructive/80">
							<li>{t('deleteWarning1')}</li>
							<li>{t('deleteWarning2')}</li>
							<li>{t('deleteWarning3')}</li>
						</ul>
					</div>
				</div>

				<AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
					<AlertDialogTrigger asChild>
						<Button variant="destructive">{t('deleteAccount')}</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="flex items-center gap-2">
								<ExclamationTriangleIcon className="size-5 text-destructive" />
								{t('deleteConfirmTitle')}
							</AlertDialogTitle>
							<AlertDialogDescription asChild>
								<div className="space-y-4">
									<p>{t('deleteConfirmDescription')}</p>
									<p className="font-medium">
										{t('deleteConfirmInstruction', { text: CONFIRMATION_TEXT })}
									</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>

						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
								<FormField
									control={form.control}
									name="confirmation"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('confirmationType')}</FormLabel>
											<FormControl>
												<Input placeholder={CONFIRMATION_TEXT} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<AlertDialogFooter>
									<AlertDialogCancel type="button">{t('cancel')}</AlertDialogCancel>
									<Button type="submit" variant="destructive" isLoading={isDeleting}>
										{t('deleteAccountPermanently')}
									</Button>
								</AlertDialogFooter>
							</form>
						</Form>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
