'use client';

import { useState, useEffect } from 'react';
import { useSession, useUser } from '@clerk/nextjs';
import {
	ComputerDesktopIcon,
	DevicePhoneMobileIcon,
	GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Session interface matching Clerk's session structure
interface ClerkSession {
	id: string;
	lastActiveAt: Date | null;
	latestActivity: {
		browserName?: string;
		deviceType?: string;
		ipAddress?: string;
	} | null;
	revoke: () => Promise<void>;
}

function getDeviceIcon(deviceType: string | undefined) {
	if (!deviceType) return <GlobeAltIcon className="size-5" />;
	const type = deviceType.toLowerCase();
	if (type.includes('mobile') || type.includes('phone')) {
		return <DevicePhoneMobileIcon className="size-5" />;
	}
	return <ComputerDesktopIcon className="size-5" />;
}

function formatDate(date: Date | number): string {
	const d = typeof date === 'number' ? new Date(date) : date;
	return d.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

interface SessionItemProps {
	session: ClerkSession;
	isCurrentSession: boolean;
	onRevoke: (sessionId: string) => Promise<void>;
	t: ReturnType<typeof useTranslations<'settings.security'>>;
}

function SessionItem({ session, isCurrentSession, onRevoke, t }: SessionItemProps) {
	const [isRevoking, setIsRevoking] = useState(false);

	const handleRevoke = async () => {
		setIsRevoking(true);
		try {
			await onRevoke(session.id);
		} finally {
			setIsRevoking(false);
		}
	};

	const client = session.latestActivity;
	const browserInfo = client?.browserName || t('unknownBrowser');
	const osInfo = client?.deviceType || '';
	const ipAddress = client?.ipAddress || t('unknownLocation');
	const lastActive = session.lastActiveAt ? formatDate(session.lastActiveAt) : t('unknown');

	return (
		<div className="flex items-center justify-between py-4">
			<div className="flex items-center gap-4">
				<div className="p-2 bg-muted rounded-lg">{getDeviceIcon(client?.deviceType)}</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">
							{browserInfo}
							{osInfo && ` on ${osInfo}`}
						</span>
						{isCurrentSession && (
							<Badge variant="secondary" className="text-xs">
								{t('currentSession')}
							</Badge>
						)}
					</div>
					<div className="text-sm text-muted-foreground">
						<span>{ipAddress}</span>
						<span className="mx-2">-</span>
						<span>
							{t('lastActive')}: {lastActive}
						</span>
					</div>
				</div>
			</div>
			{!isCurrentSession && (
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="outline" size="sm" disabled={isRevoking}>
							{isRevoking ? t('revoking') : t('revoke')}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('revokeSessionTitle')}</AlertDialogTitle>
							<AlertDialogDescription>{t('revokeSessionDescription')}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							<AlertDialogAction onClick={handleRevoke}>{t('revokeConfirm')}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}

function SessionsSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2].map((i) => (
				<div key={i} className="flex items-center justify-between py-4">
					<div className="flex items-center gap-4">
						<Skeleton className="size-10 rounded-lg" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
					</div>
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	);
}

export function SessionsSection() {
	const { session: currentSession } = useSession();
	const { user, isLoaded } = useUser();
	const t = useTranslations('settings.security');
	const [sessions, setSessions] = useState<ClerkSession[]>([]);
	const [isLoadingSessions, setIsLoadingSessions] = useState(true);

	// Load sessions on mount
	useEffect(() => {
		if (user) {
			user
				.getSessions()
				.then((userSessions) => {
					setSessions(userSessions as unknown as ClerkSession[]);
					setIsLoadingSessions(false);
				})
				.catch(() => {
					setIsLoadingSessions(false);
				});
		}
	}, [user]);

	const handleRevokeSession = async (sessionId: string) => {
		try {
			const sessionToRevoke = sessions.find((s) => s.id === sessionId);
			if (sessionToRevoke) {
				await sessionToRevoke.revoke();
				setSessions((prev) => prev.filter((s) => s.id !== sessionId));
				posthog.capture('session-revoke:success');
				toast({ title: t('sessionRevoked') });
			}
		} catch (error) {
			Sentry.captureException(error, {
				tags: { action: 'session-revoke' },
			});
			posthog.capture('error:session-revoke');
			toast({ title: t('sessionRevokeError'), variant: 'destructive' });
		}
	};

	const handleRevokeAllOtherSessions = async () => {
		try {
			const otherSessions = sessions.filter((s) => s.id !== currentSession?.id);
			await Promise.all(otherSessions.map((s) => s.revoke()));
			setSessions((prev) => prev.filter((s) => s.id === currentSession?.id));
			posthog.capture('session-revoke-all:success', { count: otherSessions.length });
			toast({ title: t('allSessionsRevoked') });
		} catch (error) {
			Sentry.captureException(error, {
				tags: { action: 'session-revoke-all' },
			});
			posthog.capture('error:session-revoke-all');
			toast({ title: t('sessionRevokeError'), variant: 'destructive' });
		}
	};

	const otherSessionsCount = sessions.filter((s) => s.id !== currentSession?.id).length;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<ComputerDesktopIcon className="size-5" />
						</div>
						<div>
							<CardTitle>{t('sessionsTitle')}</CardTitle>
							<CardDescription>{t('sessionsDescription')}</CardDescription>
						</div>
					</div>
					{otherSessionsCount > 0 && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" size="sm" className="py-2 whitespace-normal h-auto">
									{t('revokeAllOther')}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('revokeAllTitle')}</AlertDialogTitle>
									<AlertDialogDescription>
										{t('revokeAllDescription', { count: otherSessionsCount })}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
									<AlertDialogAction onClick={handleRevokeAllOtherSessions}>
										{t('revokeAllConfirm')}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{!isLoaded || isLoadingSessions ? (
					<SessionsSkeleton />
				) : sessions.length === 0 ? (
					<p className="text-sm text-muted-foreground">{t('noSessions')}</p>
				) : (
					<div className="max-h-80 overflow-y-auto pr-2">
						<div className="divide-y">
							{sessions.map((session, index) => (
								<div key={session.id}>
									{index > 0 && <Separator />}
									<SessionItem
										session={session}
										isCurrentSession={session.id === currentSession?.id}
										onRevoke={handleRevokeSession}
										t={t}
									/>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
