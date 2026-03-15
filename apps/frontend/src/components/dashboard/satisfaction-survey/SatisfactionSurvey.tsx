'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import posthog from 'posthog-js';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupTextarea,
} from '@/components/ui/input-group';
import { CharacterCounter } from '@/components/qr-generator/content/CharacterCounter';
import { useUserSurveyStatusQuery, useSubmitUserSurveyMutation } from '@/lib/api/user-survey';

const STORAGE_KEY = 'qrcodly:survey-responded';
const STORAGE_KEY_SKIPPED = 'qrcodly:survey-skipped-at';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

type Step = 'rating' | 'feedback' | 'thankyou';

function isSkippedRecently(): boolean {
	if (typeof window === 'undefined') return false;
	const skippedAt = localStorage.getItem(STORAGE_KEY_SKIPPED);
	if (!skippedAt) return false;
	return Date.now() - Number(skippedAt) < TWO_WEEKS_MS;
}

export default function SatisfactionSurvey() {
	const { isSignedIn } = useAuth();
	const { user } = useUser();
	const t = useTranslations('satisfactionSurvey');

	const [dismissed, setDismissed] = useState(() => {
		if (typeof window === 'undefined') return true;
		if (localStorage.getItem(STORAGE_KEY) === 'true') return true;
		if (isSkippedRecently()) return true;
		return false;
	});

	const accountOldEnough =
		!!user?.createdAt && Date.now() - user.createdAt.getTime() >= TWO_WEEKS_MS;

	const shouldQuery = !!isSignedIn && !dismissed && accountOldEnough;
	const { data: statusData } = useUserSurveyStatusQuery(shouldQuery);

	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<Step>('rating');
	const [feedback, setFeedback] = useState('');
	const submitMutation = useSubmitUserSurveyMutation();

	const markResponded = useCallback(() => {
		localStorage.setItem(STORAGE_KEY, 'true');
		localStorage.removeItem(STORAGE_KEY_SKIPPED);
	}, []);

	// If the API says user has already responded, mark localStorage and skip
	useEffect(() => {
		if (statusData?.hasResponded) {
			markResponded();
			setDismissed(true);
		}
	}, [statusData?.hasResponded, markResponded]);

	// Show dialog immediately when we know user hasn't responded and account is old enough
	useEffect(() => {
		if (dismissed || !statusData || statusData.hasResponded || !accountOldEnough) return;

		setOpen(true);
		posthog.capture('survey:shown');
	}, [dismissed, statusData, accountOldEnough]);

	const handleThumbsUp = () => {
		posthog.capture('survey:submitted', { rating: 'up' });
		submitMutation.mutate(
			{ rating: 'up' },
			{
				onSuccess: () => {
					markResponded();
					setStep('thankyou');
				},
			},
		);
	};

	const handleThumbsDown = () => {
		setStep('feedback');
	};

	const handleSubmitFeedback = () => {
		posthog.capture('survey:submitted', { rating: 'down', hasFeedback: !!feedback.trim() });
		submitMutation.mutate(
			{ rating: 'down', feedback: feedback.trim() || null },
			{
				onSuccess: () => {
					markResponded();
					setStep('thankyou');
				},
			},
		);
	};

	const handleSkipFeedback = () => {
		posthog.capture('survey:submitted', { rating: 'down', hasFeedback: false });
		submitMutation.mutate(
			{ rating: 'down', feedback: null },
			{
				onSuccess: () => {
					markResponded();
					setStep('thankyou');
				},
			},
		);
	};

	const handleDismiss = () => {
		posthog.capture('survey:skipped');
		// Don't save to DB — just snooze for 2 weeks via localStorage
		localStorage.setItem(STORAGE_KEY_SKIPPED, String(Date.now()));
		setDismissed(true);
		setOpen(false);
	};

	// Auto-close after thank you, then fully dismiss
	useEffect(() => {
		if (step !== 'thankyou') return;
		const timeout = setTimeout(() => {
			setOpen(false);
			setDismissed(true);
		}, 2000);
		return () => clearTimeout(timeout);
	}, [step]);

	if (dismissed || !isSignedIn || !accountOldEnough) return null;

	return (
		<Dialog open={open} onOpenChange={() => {}}>
			<DialogContent
				className="border-none shadow-xl sm:max-w-md"
				showCloseButton={false}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				{step === 'rating' && (
					<>
						<DialogHeader>
							<DialogTitle>{t('title')}</DialogTitle>
							<DialogDescription>{t('subtitle')}</DialogDescription>
						</DialogHeader>
						<div className="flex justify-center gap-6 py-4">
							<button
								type="button"
								onClick={handleThumbsUp}
								className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-transparent p-4 outline-none transition-colors hover:border-green-200 hover:bg-green-50 dark:hover:border-green-800 dark:hover:bg-green-950"
							>
								<HandThumbUpIcon className="size-10 text-muted-foreground transition-colors group-hover:text-green-600 dark:group-hover:text-green-400" />
								<span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-green-600 dark:group-hover:text-green-400">
									{t('thumbsUp')}
								</span>
							</button>
							<button
								type="button"
								onClick={handleThumbsDown}
								className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-transparent p-4 outline-none transition-colors hover:border-red-200 hover:bg-red-50 dark:hover:border-red-800 dark:hover:bg-red-950"
							>
								<HandThumbDownIcon className="size-10 text-muted-foreground transition-colors group-hover:text-red-600 dark:group-hover:text-red-400" />
								<span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-red-600 dark:group-hover:text-red-400">
									{t('thumbsDown')}
								</span>
							</button>
						</div>
						<div className="flex justify-end">
							<Button variant="ghost" size="sm" onClick={handleDismiss}>
								{t('skip')}
							</Button>
						</div>
					</>
				)}

				{step === 'feedback' && (
					<>
						<DialogHeader>
							<DialogTitle>{t('feedbackTitle')}</DialogTitle>
						</DialogHeader>
						<InputGroup>
							<InputGroupTextarea
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								placeholder={t('feedbackPlaceholder')}
								maxLength={1000}
								rows={4}
							/>
							<InputGroupAddon align="block-end">
								<InputGroupText className="ml-auto">
									<CharacterCounter current={feedback.length} max={1000} />
								</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
						<div className="flex justify-end gap-2">
							<Button variant="ghost" size="sm" onClick={handleSkipFeedback}>
								{t('skip')}
							</Button>
							<Button size="sm" onClick={handleSubmitFeedback}>
								{t('submit')}
							</Button>
						</div>
					</>
				)}

				{step === 'thankyou' && (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<DialogHeader>
							<DialogTitle>{t('thankYouTitle')}</DialogTitle>
							<DialogDescription>{t('thankYouMessage')}</DialogDescription>
						</DialogHeader>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
