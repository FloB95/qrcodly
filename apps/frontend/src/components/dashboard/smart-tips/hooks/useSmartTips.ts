'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { tips, type SmartTipStateContext, type TipDefinition } from '../tips.config';
import { useBehaviorTracker } from '../SmartTipsBehaviorTracker';
import { useSmartTipStorage } from './useSmartTipStorage';

export function useSmartTips(anchor: string, stateContext?: SmartTipStateContext) {
	const { getActionCount, actionVersion } = useBehaviorTracker();
	const { getTipRecord, markShown, markDismissed, isGloballyDisabled, setGloballyDisabled } =
		useSmartTipStorage();

	// Tips closed/dismissed this session — prevents re-showing after "Got it"
	const closedThisSessionRef = useRef<Set<string>>(new Set());

	// Track mount time for delay-based tips
	const mountTimeRef = useRef(Date.now());

	// Roll probability once per tip per mount (stable across re-renders)
	const probabilityRollsRef = useRef<Map<string, number>>(new Map());
	const getProbabilityRoll = useCallback((tipId: string) => {
		if (!probabilityRollsRef.current.has(tipId)) {
			probabilityRollsRef.current.set(tipId, Math.random());
		}
		return probabilityRollsRef.current.get(tipId)!;
	}, []);

	// The tip currently being displayed — "locked in" until user interacts
	const [displayedTip, setDisplayedTip] = useState<TipDefinition | null>(null);

	// For delay-based tips, re-evaluate periodically
	const [tick, setTick] = useState(0);

	useEffect(() => {
		// Check if any tip for this anchor uses a delay
		const hasDelayedTips = tips.some((t) => t.anchor === anchor && t.delayMs);
		if (!hasDelayedTips) return undefined;

		const interval = setInterval(() => {
			setTick((v) => v + 1);
		}, 15_000);
		return () => clearInterval(interval);
	}, [anchor]);

	// Evaluate which tip (if any) qualifies for display
	const evaluatedTip = useMemo(() => {
		if (isGloballyDisabled) return null;
		// If a tip is already being displayed, don't evaluate (it stays until user acts)
		if (displayedTip) return null;

		const elapsed = Date.now() - mountTimeRef.current;

		const anchorTips = tips
			.filter((tip) => tip.anchor === anchor)
			.sort((a, b) => a.priority - b.priority);

		for (const tip of anchorTips) {
			if (closedThisSessionRef.current.has(tip.id)) continue;

			const record = getTipRecord(tip.id);

			if (record.dismissed) continue;
			if (record.showCount >= tip.maxShowCount) continue;

			if (record.lastShownAt) {
				const cooldownMs = tip.cooldownDays * 24 * 60 * 60 * 1000;
				const sinceLastShown = Date.now() - new Date(record.lastShownAt).getTime();
				if (sinceLastShown < cooldownMs) continue;
			}

			// Check minimum delay since component mounted
			if (tip.delayMs && elapsed < tip.delayMs) continue;

			// Check probability (rolled once per mount)
			if (tip.probability !== undefined && getProbabilityRoll(tip.id) > tip.probability) continue;

			if (!evaluateCondition(tip, getActionCount, stateContext)) continue;

			return tip;
		}

		return null;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		anchor,
		isGloballyDisabled,
		displayedTip,
		actionVersion,
		stateContext,
		getTipRecord,
		getActionCount,
		getProbabilityRoll,
		tick,
	]);

	// When evaluation finds a tip, lock it in and record the show
	useEffect(() => {
		if (evaluatedTip) {
			setDisplayedTip(evaluatedTip);
			markShown(evaluatedTip.id);
			posthog.capture('smart-tip:displayed', { tipId: evaluatedTip.id });
		}
	}, [evaluatedTip, markShown]);

	const activeTip = displayedTip;

	const close = useCallback(() => {
		if (displayedTip) {
			closedThisSessionRef.current.add(displayedTip.id);
			posthog.capture('smart-tip:closed', { tipId: displayedTip.id });
			setDisplayedTip(null);
		}
	}, [displayedTip]);

	const dismiss = useCallback(() => {
		if (displayedTip) {
			markDismissed(displayedTip.id);
			closedThisSessionRef.current.add(displayedTip.id);
			posthog.capture('smart-tip:dismissed', { tipId: displayedTip.id });
			setDisplayedTip(null);
		}
	}, [displayedTip, markDismissed]);

	const disableAll = useCallback(() => {
		setGloballyDisabled(true);
		setDisplayedTip(null);
		posthog.capture('smart-tip:all-disabled');
	}, [setGloballyDisabled]);

	return { activeTip, close, dismiss, disableAll };
}

function evaluateCondition(
	tip: TipDefinition,
	getActionCount: (action: string, windowMs: number) => number,
	stateContext?: SmartTipStateContext,
): boolean {
	const { condition } = tip;
	if (condition.type === 'behavior') {
		return getActionCount(condition.action, condition.windowMs) >= condition.minCount;
	}
	if (condition.type === 'state' && stateContext) {
		return condition.evaluate(stateContext);
	}
	return false;
}
