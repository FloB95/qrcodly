'use client';

import { useCallback, useState } from 'react';
import { safeLocalStorage } from '@/lib/utils';

const STORAGE_KEY = 'qrcodly:smart-tips';

type TipRecord = {
	showCount: number;
	lastShownAt: string | null;
	dismissed: boolean;
};

type SmartTipStorageData = {
	globalDisabled: boolean;
	tips: Record<string, TipRecord>;
	version: 1;
};

const DEFAULT_DATA: SmartTipStorageData = {
	globalDisabled: false,
	tips: {},
	version: 1,
};

function load(): SmartTipStorageData {
	const raw = safeLocalStorage.getItem(STORAGE_KEY);
	if (!raw) return DEFAULT_DATA;
	try {
		const parsed = JSON.parse(raw) as SmartTipStorageData;
		if (parsed.version !== 1) return DEFAULT_DATA;
		return parsed;
	} catch {
		return DEFAULT_DATA;
	}
}

function save(data: SmartTipStorageData) {
	safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const DEFAULT_TIP_RECORD: TipRecord = { showCount: 0, lastShownAt: null, dismissed: false };

export function useSmartTipStorage() {
	const [data, setData] = useState<SmartTipStorageData>(load);

	const getTipRecord = useCallback(
		(tipId: string): TipRecord => {
			return data.tips[tipId] ?? DEFAULT_TIP_RECORD;
		},
		[data],
	);

	const markShown = useCallback((tipId: string) => {
		setData((prev) => {
			const existing = prev.tips[tipId] ?? DEFAULT_TIP_RECORD;
			const next: SmartTipStorageData = {
				...prev,
				tips: {
					...prev.tips,
					[tipId]: {
						...existing,
						showCount: existing.showCount + 1,
						lastShownAt: new Date().toISOString(),
					},
				},
			};
			save(next);
			return next;
		});
	}, []);

	const markDismissed = useCallback((tipId: string) => {
		setData((prev) => {
			const existing = prev.tips[tipId] ?? DEFAULT_TIP_RECORD;
			const next: SmartTipStorageData = {
				...prev,
				tips: {
					...prev.tips,
					[tipId]: { ...existing, dismissed: true },
				},
			};
			save(next);
			return next;
		});
	}, []);

	const isGloballyDisabled = data.globalDisabled;

	const setGloballyDisabled = useCallback((disabled: boolean) => {
		setData((prev) => {
			const next: SmartTipStorageData = { ...prev, globalDisabled: disabled };
			save(next);
			return next;
		});
	}, []);

	return { getTipRecord, markShown, markDismissed, isGloballyDisabled, setGloballyDisabled };
}
