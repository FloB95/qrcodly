'use client';

import { useState, useRef } from 'react';
import { useUser, useSignIn } from '@clerk/nextjs';
import {
	PencilIcon,
	CameraIcon,
	EnvelopeIcon,
	CheckCircleIcon,
	KeyIcon,
	EyeIcon,
	EyeSlashIcon,
} from '@heroicons/react/24/outline';
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

interface ClerkError {
	errors?: Array<{ code?: string; message?: string }>;
}

function isClerkError(error: unknown): error is ClerkError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'errors' in error &&
		Array.isArray((error as ClerkError).errors)
	);
}

function isReverificationRequired(error: unknown): boolean {
	if (isClerkError(error)) {
		return error.errors?.some((e) => e.code === 'session_reverification_required') ?? false;
	}
	return false;
}

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
	const { signIn } = useSignIn();
	const t = useTranslations('settings.profile');
	const [isEditing, setIsEditing] = useState(false);
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
	const [verificationCode, setVerificationCode] = useState('');
	const [isVerifying, setIsVerifying] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Password reverification state
	const [needsReverification, setNeedsReverification] = useState(false);
	const [reverificationPassword, setReverificationPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isReverifying, setIsReverifying] = useState(false);

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
		setNeedsReverification(false);
		setReverificationPassword('');
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

	const setPrimaryEmail = async () => {
		if (!user || !pendingEmailId) return;

		try {
			await user.update({ primaryEmailAddressId: pendingEmailId });
			toast.success(t('emailUpdated'));
			setIsEditingEmail(false);
			setPendingEmailId(null);
			setVerificationCode('');
			setNeedsReverification(false);
		} catch (error) {
			if (isReverificationRequired(error)) {
				setNeedsReverification(true);
			} else {
				toast.error(t('verificationError'));
			}
		}
	};

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
			await setPrimaryEmail();
		} catch (error) {
			if (isReverificationRequired(error)) {
				setNeedsReverification(true);
			} else {
				toast.error(t('verificationError'));
			}
		} finally {
			setIsVerifying(false);
		}
	};

	const handleReverification = async () => {
		if (!user || !signIn || !reverificationPassword) return;

		const primaryEmailAddress = user.primaryEmailAddress?.emailAddress;
		if (!primaryEmailAddress) {
			toast.error(t('reverificationError'));
			return;
		}

		setIsReverifying(true);
		try {
			// Re-authenticate with password to refresh the session
			const result = await signIn.create({
				identifier: primaryEmailAddress,
				password: reverificationPassword,
			});

			if (result.status === 'complete') {
				// Session is refreshed, now try to set the primary email again
				await setPrimaryEmail();
			} else {
				toast.error(t('reverificationError'));
			}
		} catch {
			toast.error(t('reverificationError'));
		} finally {
			setIsReverifying(false);
			setReverificationPassword('');
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
		if (needsReverification) {
			return (
				<div className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<div className="p-3 bg-primary/10 rounded-full">
							<KeyIcon className="size-6" />
						</div>
						<p className="text-sm text-muted-foreground">{t('reverificationRequired')}</p>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">{t('currentPassword')}</label>
						<div className="relative">
							<Input
								type={showPassword ? 'text' : 'password'}
								value={reverificationPassword}
								onChange={(e) => setReverificationPassword(e.target.value)}
								placeholder="********"
								disabled={isReverifying}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showPassword ? (
									<EyeSlashIcon className="size-5" />
								) : (
									<EyeIcon className="size-5" />
								)}
							</button>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setNeedsReverification(false);
								setReverificationPassword('');
							}}
							disabled={isReverifying}
						>
							{t('back')}
						</Button>
						<Button
							onClick={handleReverification}
							disabled={!reverificationPassword}
							isLoading={isReverifying}
						>
							{t('confirmAndSave')}
						</Button>
					</DialogFooter>
				</div>
			);
		}

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
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-3">
									<div className="p-2 bg-muted rounded-lg">
										<EnvelopeIcon className="size-5" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<span className="font-medium">{primaryEmail || t('noEmail')}</span>
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
							setNeedsReverification(false);
							setReverificationPassword('');
						}
						setIsEditingEmail(open);
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t('changeEmailTitle')}</DialogTitle>
							<DialogDescription>
								{needsReverification
									? t('reverificationDescription')
									: pendingEmailId
										? t('verifyEmailDescription')
										: t('changeEmailDescription')}
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
