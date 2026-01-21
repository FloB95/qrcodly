'use client';

import { useState, useRef, useCallback } from 'react';
import { useUser, useReverification } from '@clerk/nextjs';
import { PencilIcon, CameraIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const profileSchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().optional(),
});

const emailSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

function ProfileSkeleton() {
	return (
		<div className="flex items-center gap-6">
			<Skeleton className="size-24 rounded-full" />
			<div className="space-y-2">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>
		</div>
	);
}

export function ProfileSection() {
	const { user, isLoaded } = useUser();
	const t = useTranslations('settings.profile');
	const [isEditing, setIsEditing] = useState(false);
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
	const [verificationCode, setVerificationCode] = useState('');
	const [isVerifying, setIsVerifying] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: {
			firstName: user?.firstName || '',
			lastName: user?.lastName || '',
		},
	});

	const emailForm = useForm<EmailFormValues>({
		resolver: zodResolver(emailSchema),
		defaultValues: {
			email: '',
		},
	});

	const handleEditOpen = () => {
		form.reset({
			firstName: user?.firstName || '',
			lastName: user?.lastName || '',
		});
		setIsEditing(true);
	};

	const handleEmailEditOpen = () => {
		emailForm.reset({ email: '' });
		setPendingEmailId(null);
		setVerificationCode('');
		setIsEditingEmail(true);
	};

	const onSubmit = async (data: ProfileFormValues) => {
		if (!user) return;

		setIsLoading(true);
		try {
			await user.update({
				firstName: data.firstName,
				lastName: data.lastName || '',
			});
			toast.success(t('profileUpdated'));
			setIsEditing(false);
		} catch {
			toast.error(t('profileUpdateError'));
		} finally {
			setIsLoading(false);
		}
	};

	const onEmailSubmit = async (data: EmailFormValues) => {
		if (!user) return;

		setIsLoading(true);
		try {
			const emailAddress = await user.createEmailAddress({ email: data.email });
			await emailAddress.prepareVerification({ strategy: 'email_code' });
			setPendingEmailId(emailAddress.id);
			toast.success(t('verificationCodeSent'));
		} catch {
			toast.error(t('emailAddError'));
		} finally {
			setIsLoading(false);
		}
	};

	// Wrap the set primary email function with useReverification
	// This automatically handles the reverification modal when Clerk requires it
	const setPrimaryEmailWithReverification = useReverification(
		useCallback(
			async (emailId: string) => {
				if (!user) return;
				await user.update({ primaryEmailAddressId: emailId });
			},
			[user],
		),
	);

	const handleVerifyEmail = async () => {
		if (!user || !pendingEmailId || verificationCode.length !== 6) return;

		setIsVerifying(true);
		try {
			const emailAddress = user.emailAddresses.find((e) => e.id === pendingEmailId);
			if (!emailAddress) {
				toast.error(t('emailNotFound'));
				return;
			}

			await emailAddress.attemptVerification({ code: verificationCode });

			// Set as primary email (with automatic reverification if needed)
			await setPrimaryEmailWithReverification(pendingEmailId);

			toast.success(t('emailUpdated'));
			setIsEditingEmail(false);
			setPendingEmailId(null);
			setVerificationCode('');
		} catch {
			toast.error(t('verificationError'));
		} finally {
			setIsVerifying(false);
		}
	};

	const handleImageClick = () => {
		fileInputRef.current?.click();
	};

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !user) return;

		if (!file.type.startsWith('image/')) {
			toast.error(t('invalidImageType'));
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			toast.error(t('imageTooLarge'));
			return;
		}

		setIsUploadingImage(true);
		try {
			await user.setProfileImage({ file });
			toast.success(t('imageUpdated'));
		} catch {
			toast.error(t('imageUpdateError'));
		} finally {
			setIsUploadingImage(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const getInitials = () => {
		if (!user) return '';
		const first = user.firstName?.[0] || '';
		const last = user.lastName?.[0] || '';
		return (
			(first + last).toUpperCase() ||
			user.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
			'?'
		);
	};

	const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
	const primaryEmail = user?.primaryEmailAddress?.emailAddress;

	// Render the email verification step content
	const renderEmailVerificationContent = () => {
		return (
			<div className="space-y-4">
				<div className="flex flex-col items-center gap-4">
					<p className="text-sm text-muted-foreground text-center">{t('enterVerificationCode')}</p>
					<InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setPendingEmailId(null);
							setVerificationCode('');
						}}
						disabled={isVerifying}
					>
						{t('back')}
					</Button>
					<Button
						onClick={handleVerifyEmail}
						disabled={verificationCode.length !== 6}
						isLoading={isVerifying}
					>
						{t('verifyAndSave')}
					</Button>
				</DialogFooter>
			</div>
		);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start gap-3">
					<div>
						<CardTitle>{t('title')}</CardTitle>
						<CardDescription>{t('description')}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{!isLoaded ? (
					<ProfileSkeleton />
				) : (
					<>
						{/* Profile Info Section */}
						<div className="flex flex-row items-start sm:items-center gap-6">
							{/* Avatar */}
							<div className="relative group">
								<Avatar className="size-16 border-4 border-background shadow-lg">
									<AvatarImage src={user?.imageUrl} alt={fullName || 'Profile'} />
									<AvatarFallback className="text-xl font-medium bg-primary/10">
										{getInitials()}
									</AvatarFallback>
								</Avatar>
								<button
									onClick={handleImageClick}
									disabled={isUploadingImage}
									className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
									aria-label={t('changePhoto')}
								>
									{isUploadingImage ? (
										<div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<CameraIcon className="size-6 text-white" />
									)}
								</button>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									onChange={handleImageChange}
									className="hidden"
								/>
							</div>

							{/* Name Info */}
							<div className="flex-1 min-w-0">
								<div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 items-center">
									<div className="min-w-0">
										<h3 className="text-md font-semibold truncate">{fullName || t('noName')}</h3>
									</div>
									<Button variant="outline" size="sm" onClick={handleEditOpen} className="shrink-0">
										<PencilIcon className="size-4 mr-2" />
										{t('edit')}
									</Button>
								</div>
							</div>
						</div>

						{/* Email Section */}
						<div className="border-t pt-6">
							<div className="flex flex-col gap-3 flex-wrap sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-3 flex-wrap">
									<div className="p-2 bg-muted rounded-lg">
										<EnvelopeIcon className="size-5" />
									</div>
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-medium break-all">{primaryEmail || t('noEmail')}</span>
											{user?.primaryEmailAddress?.verification?.status === 'verified' && (
												<Badge variant="secondary" className="text-xs gap-1">
													<CheckCircleIcon className="size-3" />
													{t('verified')}
												</Badge>
											)}
										</div>
										<p className="text-sm text-muted-foreground">{t('emailDescription')}</p>
									</div>
								</div>
								<Button variant="outline" size="sm" onClick={handleEmailEditOpen}>
									{t('changeEmail')}
								</Button>
							</div>
						</div>
					</>
				)}

				{/* Edit Profile Dialog */}
				<Dialog open={isEditing} onOpenChange={setIsEditing}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t('editProfile')}</DialogTitle>
							<DialogDescription>{t('editProfileDescription')}</DialogDescription>
						</DialogHeader>

						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('firstName')}</FormLabel>
											<FormControl>
												<Input
													placeholder={t('firstNamePlaceholder')}
													disabled={isLoading}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="lastName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('lastName')}</FormLabel>
											<FormControl>
												<Input
													placeholder={t('lastNamePlaceholder')}
													disabled={isLoading}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsEditing(false)}
										disabled={isLoading}
									>
										{t('cancel')}
									</Button>
									<Button type="submit" isLoading={isLoading}>
										{t('save')}
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</DialogContent>
				</Dialog>

				{/* Change Email Dialog */}
				<Dialog
					open={isEditingEmail}
					onOpenChange={(open) => {
						if (!open) {
							setPendingEmailId(null);
							setVerificationCode('');
						}
						setIsEditingEmail(open);
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t('changeEmailTitle')}</DialogTitle>
							<DialogDescription>
								{!pendingEmailId && t('changeEmailDescription')}
							</DialogDescription>
						</DialogHeader>

						{!pendingEmailId ? (
							<Form {...emailForm}>
								<form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
									<FormField
										control={emailForm.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t('newEmail')}</FormLabel>
												<FormControl>
													<Input
														type="email"
														placeholder={t('newEmailPlaceholder')}
														disabled={isLoading}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<DialogFooter>
										<Button
											type="button"
											variant="outline"
											onClick={() => setIsEditingEmail(false)}
											disabled={isLoading}
										>
											{t('cancel')}
										</Button>
										<Button type="submit" isLoading={isLoading}>
											{t('sendVerificationCode')}
										</Button>
									</DialogFooter>
								</form>
							</Form>
						) : (
							renderEmailVerificationContent()
						)}
					</DialogContent>
				</Dialog>
			</CardContent>
		</Card>
	);
}
