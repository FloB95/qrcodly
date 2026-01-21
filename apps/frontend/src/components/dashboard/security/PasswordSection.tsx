'use client';

import { useState, useCallback } from 'react';
import { useSession, useReverification } from '@clerk/nextjs';
import { KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string().min(1, 'Please confirm your password'),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ClerkError {
	errors?: Array<{ message: string; code?: string }>;
}

// Type guard for Clerk errors
function isClerkError(error: unknown): error is ClerkError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'errors' in error &&
		Array.isArray((error as ClerkError).errors)
	);
}

// Extract user-friendly error message from Clerk error
function getClerkErrorMessage(error: unknown, fallback: string): string {
	if (isClerkError(error)) {
		return error.errors?.[0]?.message || fallback;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return fallback;
}

export function PasswordSection() {
	const { toast } = useToast();
	const t = useTranslations('settings.security');
	const { session } = useSession();

	const [isLoading, setIsLoading] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const form = useForm<PasswordFormValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		},
	});

	const hasPasswordAuth = session?.user.passwordEnabled;

	// Wrap the password update function with useReverification
	// This automatically handles the reverification modal when Clerk requires it
	const updatePasswordWithReverification = useReverification(
		useCallback(
			async (data: PasswordFormValues) => {
				if (!session) return;

				await session.user.updatePassword({
					currentPassword: data.currentPassword,
					newPassword: data.newPassword,
					signOutOfOtherSessions: true,
				});
			},
			[session],
		),
	);

	const onSubmit = async (data: PasswordFormValues) => {
		if (!session) return;

		setIsLoading(true);

		try {
			await updatePasswordWithReverification(data);

			posthog.capture('password-change:success');

			toast({
				title: t('passwordUpdated'),
				description: t('passwordUpdatedDescription'),
			});

			form.reset();
		} catch (error) {
			const errorMessage = getClerkErrorMessage(error, t('passwordUpdateError'));

			Sentry.captureException(error, {
				tags: { action: 'password-change' },
			});
			posthog.capture('error:password-change', { errorMessage });

			toast({
				variant: 'destructive',
				description: errorMessage,
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Render "no password auth" state for OAuth-only users
	if (!hasPasswordAuth) {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-start gap-3 flex-wrap">
						<div className="p-2 bg-primary/10 rounded-lg">
							<KeyIcon className="size-5" />
						</div>
						<div>
							<CardTitle>{t('passwordTitle')}</CardTitle>
							<CardDescription>{t('passwordDescription')}</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">{t('noPasswordAuth')}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start gap-3 flex-wrap">
					<div className="p-2 bg-primary/10 rounded-lg">
						<KeyIcon className="size-5" />
					</div>
					<div>
						<CardTitle>{t('passwordTitle')}</CardTitle>
						<CardDescription>{t('passwordDescription')}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="currentPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('currentPassword')}</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												type={showCurrentPassword ? 'text' : 'password'}
												placeholder="********"
												disabled={isLoading}
												{...field}
											/>
											<button
												type="button"
												onClick={() => setShowCurrentPassword(!showCurrentPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												{showCurrentPassword ? (
													<EyeSlashIcon className="size-5" />
												) : (
													<EyeIcon className="size-5" />
												)}
											</button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('newPassword')}</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												type={showNewPassword ? 'text' : 'password'}
												placeholder="********"
												disabled={isLoading}
												{...field}
											/>
											<button
												type="button"
												onClick={() => setShowNewPassword(!showNewPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												{showNewPassword ? (
													<EyeSlashIcon className="size-5" />
												) : (
													<EyeIcon className="size-5" />
												)}
											</button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('confirmPassword')}</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												type={showConfirmPassword ? 'text' : 'password'}
												placeholder="********"
												disabled={isLoading}
												{...field}
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												{showConfirmPassword ? (
													<EyeSlashIcon className="size-5" />
												) : (
													<EyeIcon className="size-5" />
												)}
											</button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							isLoading={isLoading}
							className="mt-2 whitespace-normal h-auto xs:h-9"
						>
							{t('updatePassword')}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
