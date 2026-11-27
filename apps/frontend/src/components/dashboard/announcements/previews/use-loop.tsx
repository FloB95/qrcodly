'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Wait this long, then apply the change. */
export type LoopStep<S> = [number, (state: S) => S];

/**
 * Plays the steps in a loop, from `start` each round. With reduced motion it shows `end` and
 * does not move. `round` counts the rounds and `durationMs` is one round, for `LoopProgress`.
 */
export function useLoop<S>(steps: LoopStep<S>[], start: S, end: S) {
	const animate = !useReducedMotion();
	const [state, setState] = useState(start);
	const [round, setRound] = useState(0);
	const durationMs = steps.reduce((sum, [delay]) => sum + delay, 0);

	useEffect(() => {
		if (!animate) return;
		let index = 0;
		let timer: ReturnType<typeof setTimeout>;
		const next = () => {
			const [delay, apply] = steps[index]!;
			timer = setTimeout(() => {
				index = (index + 1) % steps.length;
				if (index === 0) {
					setState(start);
					setRound((r) => r + 1);
				} else {
					setState(apply);
				}
				next();
			}, delay);
		};
		next();
		return () => clearTimeout(timer);
	}, [steps, start, animate]);

	return { state: animate ? state : end, round, durationMs, animate };
}

/** A thin bar along the bottom of the preview that fills once per round. */
export function LoopProgress({
	round,
	durationMs,
	animate,
}: {
	round: number;
	durationMs: number;
	animate: boolean;
}) {
	if (!animate) return null;
	return (
		<div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-200">
			<motion.div
				key={round}
				className="h-full origin-left bg-slate-900"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: durationMs / 1000, ease: 'linear' }}
			/>
		</div>
	);
}
