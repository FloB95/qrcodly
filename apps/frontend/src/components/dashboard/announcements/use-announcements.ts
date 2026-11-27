'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { useUser } from '@clerk/nextjs';
import { safeLocalStorage } from '@/lib/utils';
import {
	BADGE_DAYS,
	LISTED_ANNOUNCEMENTS,
	announcements,
	type Announcement,
} from './announcements.config';

const STORAGE_KEY = 'qrcodly:announcements';
const DAY_MS = 24 * 60 * 60 * 1000;

type AnnouncementRecord = {
	/** First time the user opened the list with this announcement in it. */
	seenAt?: number;
	/** First time the user opened the feature itself; its badge in place is then no longer needed. */
	usedAt?: number;
};

type Records = Record<string, AnnouncementRecord>;

const NO_RECORDS: Records = {};
const listeners = new Set<() => void>();
let records: Records | null = null;

function readRecords(): Records {
	if (records) return records;
	try {
		records = JSON.parse(safeLocalStorage.getItem(STORAGE_KEY) ?? '{}') as Records;
	} catch {
		records = {};
	}
	return records;
}

/** Keeps the first time only, so "seen" and "used" never move later. */
function record(ids: string[], field: keyof AnnouncementRecord) {
	const current = readRecords();
	const missing = ids.filter((id) => current[id]?.[field] === undefined);
	if (missing.length === 0) return;

	const now = Date.now();
	records = { ...current };
	for (const id of missing) records[id] = { ...records[id], [field]: now };
	safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(records));
	listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function useRecords(): Records {
	return useSyncExternalStore(subscribe, readRecords, () => NO_RECORDS);
}

const releaseOf = (announcement: Announcement) => Date.parse(`${announcement.date}T00:00:00Z`);

function useAccountCreatedAt(): number | null {
	const { user, isLoaded } = useUser();
	if (!isLoaded || !user?.createdAt) return null;
	return user.createdAt.getTime();
}

/**
 * The "what's new" list in the dashboard header: always the newest announcements. New to the user
 * is what came out after the account was created and is not seen yet, however long they were away.
 */
export function useAnnouncements() {
	const accountCreatedAt = useAccountCreatedAt();
	const stored = useRecords();
	const [now] = useState(() => Date.now());

	const listed = announcements
		.filter((announcement) => releaseOf(announcement) <= now)
		.slice(0, LISTED_ANNOUNCEMENTS);

	const isUnseen = (announcement: Announcement) =>
		accountCreatedAt !== null &&
		accountCreatedAt < releaseOf(announcement) &&
		stored[announcement.id]?.seenAt === undefined;

	const markSeen = () =>
		record(
			listed.map((announcement) => announcement.id),
			'seenAt',
		);

	return { listed, isUnseen, hasUnseen: listed.some(isUnseen), markSeen };
}

/** The "new" badge on the feature itself, until the user has opened it once. */
export function useNewFeatureBadge(id: string) {
	const accountCreatedAt = useAccountCreatedAt();
	const stored = useRecords();
	const [now] = useState(() => Date.now());
	const announcement = announcements.find((a) => a.id === id);
	const release = announcement ? releaseOf(announcement) : NaN;

	// only for accounts that knew the product before, and not forever
	const visible =
		accountCreatedAt !== null &&
		accountCreatedAt < release &&
		now >= release &&
		now < release + BADGE_DAYS * DAY_MS &&
		stored[id]?.usedAt === undefined;

	const markUsed = useCallback(() => record([id], 'usedAt'), [id]);

	return { visible, markUsed };
}
