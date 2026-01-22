'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Mail } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from '@/components/ui/input-otp';

interface VerificationCodeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onVerify: (code: string) => Promise<void>;
	onResend: () => Promise<void>;
	email?: string;
	isVerifying?: boolean;
	error?: string | null;
}

const RESEND_COOLDOWN = 60;

export function VerificationCodeDialog({
	open,
	onOpenChange,
	onVerify,
	onResend,
	email,
	isVerifying = false,
	error = null,
}: VerificationCodeDialogProps) {
	const t = useTranslations('settings.security');
	const [code, setCode] = useState('');
	const [resendCooldown, setResendCooldown] = useState(0);
	const [isResending, setIsResending] = useState(false);

	// Reset state when dialog opens/closes
	useEffect(() => {
		if (open) {
			setCode('');
			setResendCooldown(RESEND_COOLDOWN);
		}
	}, [open]);

	// Countdown timer for resend cooldown
	useEffect(() => {
		if (resendCooldown <= 0) return;

		const timer = setInterval(() => {
			setResendCooldown((prev) => Math.max(0, prev - 1));
		}, 1000);

		return () => clearInterval(timer);
	}, [resendCooldown]);

	const handleResend = useCallback(async () => {
		if (resendCooldown > 0 || isResending) return;

		setIsResending(true);
		try {
			await onResend();
			setResendCooldown(RESEND_COOLDOWN);
			setCode('');
		} finally {
			setIsResending(false);
		}
	}, [resendCooldown, isResending, onResend]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (code.length === 6 && !isVerifying) {
				onVerify(code);
			}
		},
		[code, isVerifying, onVerify],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="size-5" />
						{t('verificationTitle')}
					</DialogTitle>
					<DialogDescription>
						{t('verificationDescription', { email: email || '' })}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="flex flex-col items-center gap-4">
						<InputOTP
							maxLength={6}
							value={code}
							onChange={setCode}
							disabled={isVerifying}
							autoFocus
						>
							<InputOTPGroup>
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
							</InputOTPGroup>
							<InputOTPSeparator />
							<InputOTPGroup>
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>

						{error && <p className="text-sm text-destructive text-center">{error}</p>}

						<div className="text-center">
							<p className="text-sm text-muted-foreground mb-2">{t('didNotReceiveCode')}</p>
							<Button
								type="button"
								variant="link"
								size="sm"
								onClick={handleResend}
								disabled={resendCooldown > 0 || isResending}
								className="p-0 h-auto"
							>
								{isResending ? (
									<>
										<Loader2 className="mr-2 size-3 animate-spin" />
										{t('resending')}
									</>
								) : resendCooldown > 0 ? (
									t('resendIn', { seconds: resendCooldown })
								) : (
									t('resendCode')
								)}
							</Button>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isVerifying}
						>
							{t('cancel')}
						</Button>
						<Button type="submit" disabled={code.length !== 6 || isVerifying}>
							{isVerifying && <Loader2 className="mr-2 size-4 animate-spin" />}
							{t('verify')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
