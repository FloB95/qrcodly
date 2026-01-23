'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

interface LazyMotionProviderProps {
	children: ReactNode;
}

/**
 * LazyMotionProvider - Reduces initial bundle size by lazy loading framer-motion features.
 * Use this wrapper for components that need motion animations but aren't critical for FCP.
 *
 * The domAnimation feature set includes:
 * - animate, exit, initial props
 * - AnimatePresence
 * - useAnimate, useInView, useScroll hooks
 *
 * For full features (layout animations, drag, etc.), use domMax instead.
 */
export function LazyMotionProvider({ children }: LazyMotionProviderProps) {
	return (
		<LazyMotion features={domAnimation} strict>
			{children}
		</LazyMotion>
	);
}

// Re-export m for use with LazyMotion (smaller than motion)
export { m } from 'framer-motion';
