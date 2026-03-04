import { useRef, useState, useCallback, type RefObject } from 'react';

/**
 * Detects whether a text element is truncated (has overflow).
 * Returns a ref to attach to the element and a boolean indicating truncation.
 * Uses onMouseEnter callback to check only on hover, avoiding layout thrashing.
 */
export function useIsTruncated<T extends HTMLElement = HTMLElement>(): [
	RefObject<T | null>,
	boolean,
	() => void,
] {
	const ref = useRef<T | null>(null);
	const [isTruncated, setIsTruncated] = useState(false);

	const checkTruncation = useCallback(() => {
		if (ref.current) {
			setIsTruncated(ref.current.scrollWidth > ref.current.clientWidth);
		}
	}, []);

	return [ref, isTruncated, checkTruncation];
}
