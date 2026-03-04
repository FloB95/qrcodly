'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ActionEntry = {
	action: string;
	timestamp: number;
};

type BehaviorTrackerContextValue = {
	trackAction: (action: string) => void;
	getActionCount: (action: string, windowMs: number) => number;
	actionVersion: number;
};

const BehaviorTrackerContext = createContext<BehaviorTrackerContextValue | null>(null);

const MAX_AGE_MS = 5 * 60_000;

export function SmartTipsBehaviorTrackerProvider({ children }: { children: ReactNode }) {
	const entriesRef = useRef<ActionEntry[]>([]);
	const [actionVersion, setActionVersion] = useState(0);

	const prune = useCallback(() => {
		const cutoff = Date.now() - MAX_AGE_MS;
		entriesRef.current = entriesRef.current.filter((e) => e.timestamp >= cutoff);
	}, []);

	const trackAction = useCallback(
		(action: string) => {
			prune();
			entriesRef.current.push({ action, timestamp: Date.now() });
			setActionVersion((v) => v + 1);
		},
		[prune],
	);

	const getActionCount = useCallback(
		(action: string, windowMs: number) => {
			prune();
			const cutoff = Date.now() - windowMs;
			return entriesRef.current.filter((e) => e.action === action && e.timestamp >= cutoff).length;
		},
		[prune],
	);

	return (
		<BehaviorTrackerContext.Provider value={{ trackAction, getActionCount, actionVersion }}>
			{children}
		</BehaviorTrackerContext.Provider>
	);
}

const noopGetActionCount = () => 0;

const fallback: BehaviorTrackerContextValue = {
	trackAction: () => {},
	getActionCount: noopGetActionCount,
	actionVersion: 0,
};

export function useBehaviorTracker() {
	const ctx = useContext(BehaviorTrackerContext);
	return ctx ?? fallback;
}
