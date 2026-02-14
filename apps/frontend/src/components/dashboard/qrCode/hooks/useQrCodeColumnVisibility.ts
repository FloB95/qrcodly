'use client';

import { useState, useCallback } from 'react';
import posthog from 'posthog-js';

export const QR_CODE_COLUMNS = ['content', 'status', 'scans', 'created', 'tags'] as const;

export type QrCodeColumn = (typeof QR_CODE_COLUMNS)[number];

export type QrCodeColumnVisibility = Record<QrCodeColumn, boolean>;

const STORAGE_KEY = 'qrcodly:qr-table-columns';

const DEFAULT_VISIBILITY: QrCodeColumnVisibility = {
	content: true,
	status: true,
	scans: true,
	created: true,
	tags: true,
};

function loadVisibility(): QrCodeColumnVisibility {
	if (typeof window === 'undefined') return DEFAULT_VISIBILITY;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return DEFAULT_VISIBILITY;
		const parsed = JSON.parse(stored);
		return { ...DEFAULT_VISIBILITY, ...parsed };
	} catch {
		return DEFAULT_VISIBILITY;
	}
}

export function useQrCodeColumnVisibility() {
	const [visibility, setVisibility] = useState<QrCodeColumnVisibility>(loadVisibility);

	const toggleColumn = useCallback((column: QrCodeColumn) => {
		setVisibility((prev) => {
			const next = { ...prev, [column]: !prev[column] };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			posthog.capture('qr-table:column-toggled', { column, visible: next[column] });
			return next;
		});
	}, []);

	const isVisible = useCallback((column: QrCodeColumn) => visibility[column], [visibility]);

	return { visibility, toggleColumn, isVisible };
}
